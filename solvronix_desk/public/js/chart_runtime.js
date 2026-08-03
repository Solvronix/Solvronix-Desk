/* Solvronix chart runtime: scoped chart registration and theme reapplication. */
(function () {
  "use strict";

  var config = (window.frappe && frappe.boot && frappe.boot.st_theme_config) || {};
  var schema = (window.frappe && frappe.boot && frappe.boot.st_chart_schema) || { groups: {} };
  var registrations = new Map();
  var revision = 1;
  var applying = false;
  var observer = null;
  var sessionSequence = 0;
  var FULL_GROUPS = ["chart", "surface", "series_defaults", "axes", "legend", "labels", "tooltip", "animation", "interaction", "advanced"];
  var SPARKLINE_GROUPS = ["chart", "surface", "series_defaults", "animation", "interaction"];
  var DARK_SYSTEM_DEFAULTS = {
    "surface.background": "#1A1D27",
    "surface.card_background": "#20242F",
    "surface.border_color": "#343A46",
    "series_defaults.palette": ["#7AA2F7", "#FF9E64", "#73DACA", "#7DCFFF", "#BB9AF7"],
    "axes.axis_color": "#6F7A8A",
    "axes.grid_color": "#343A46",
    "axes.label_color": "#AEB7C5",
    "legend.text_color": "#D8DEE8",
    "labels.text_color": "#E8EDF5",
    "tooltip.background": "#232834",
    "tooltip.text_color": "#F3F5F8",
    "tooltip.border_color": "#3B4352"
  };

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function encodeIdentity(family, segments) {
    return ["v1", family].concat((segments || []).map(function (segment) {
      segment = String(segment);
      return segment.length + ":" + segment;
    })).join("|");
  }

  function defaultsFromSchema() {
    var result = {};
    Object.keys(schema.groups || {}).forEach(function (group) {
      result[group] = {};
      Object.keys(schema.groups[group] || {}).forEach(function (key) {
        result[group][key] = clone(schema.groups[group][key].default);
      });
    });
    return result;
  }

  function isDarkMode() {
    try {
      return document.documentElement.getAttribute("data-theme") === "dark";
    } catch (ignored) { return false; }
  }

  function setPath(target, path, value) {
    var parts = path.split(".");
    var leaf = parts.pop();
    parts.forEach(function (part) { target = target[part] || (target[part] = {}); });
    target[leaf] = clone(value);
  }

  function deepOverlay(base, owned) {
    var result = clone(base || {}) || {};
    Object.keys(owned || {}).forEach(function (key) {
      var value = owned[key];
      if (value && typeof value === "object" && !Array.isArray(value) &&
          result[key] && typeof result[key] === "object" && !Array.isArray(result[key])) {
        result[key] = deepOverlay(result[key], value);
      } else {
        result[key] = clone(value);
      }
    });
    return result;
  }

  function markOwnership(target, values, owner, prefix) {
    Object.keys(values || {}).forEach(function (key) {
      var path = prefix ? prefix + "." + key : key;
      var value = values[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        markOwnership(target, value, owner, path);
      } else {
        target[path] = owner;
      }
    });
  }

  function resolveEffective(chartId) {
    var values = defaultsFromSchema();
    if (isDarkMode()) {
      Object.keys(DARK_SYSTEM_DEFAULTS).forEach(function (path) {
        setPath(values, path, DARK_SYSTEM_DEFAULTS[path]);
      });
    }
    var ownership = {};
    markOwnership(ownership, values, "system", "");
    var globals = config.chart_defaults || {};
    values = deepOverlay(values, globals);
    markOwnership(ownership, globals, "global", "");
    var individual = (config.chart_overrides || {})[chartId] || {};
    var nonSeries = {};
    Object.keys(individual).forEach(function (key) {
      if (key !== "series") nonSeries[key] = individual[key];
    });
    values = deepOverlay(values, nonSeries);
    markOwnership(ownership, nonSeries, "individual", "");
    if (individual.series) {
      values.series = {};
      Object.keys(individual.series).forEach(function (seriesKey) {
        values.series[seriesKey] = deepOverlay(values.series_defaults || {}, individual.series[seriesKey]);
      });
      markOwnership(ownership, { series: individual.series }, "individual", "");
    }
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      values.animation = values.animation || {};
      values.animation.enabled = false;
      values.animation.duration = 0;
    }
    return { values: values, ownership: ownership };
  }

  function warn(record, error) {
    var detail = {
      id: record && record.id,
      family: record && record.family,
      message: String((error && error.message) || error || "Chart customization failed")
    };
    try { window.dispatchEvent(new CustomEvent("st-chart-runtime-warning", { detail: detail })); }
    catch (ignored) {}
  }

  function setToken(root, name, value, unit) {
    if (!root || !root.style || typeof root.style.setProperty !== "function" || value == null || value === "") return;
    root.style.setProperty(name, String(value) + (unit || ""));
  }

  function shadowValue(value) {
    if (value === "none") return "none";
    if (value === "elevated") return "0 14px 32px rgba(15,23,42,.16)";
    return "0 5px 14px rgba(15,23,42,.10)";
  }

  function structuralOptions(values) {
    var chart = values.chart || {};
    return {
      type: chart.type || "source",
      height: chart.height == null ? 240 : chart.height,
      orientation: chart.orientation || "vertical",
      stacked: !!chart.stacked,
      responsive: chart.responsive !== false
    };
  }

  function validateShape(record, options) {
    var datasets = record && record.source && record.source.data && record.source.data.datasets;
    datasets = Array.isArray(datasets) ? datasets : [];
    if (["pie", "donut", "percentage"].indexOf(options.type) >= 0 && datasets.length > 1) {
      throw new Error(options.type + " charts support one dataset for this source");
    }
    return true;
  }

  function applyStructure(record, values) {
    var options = structuralOptions(values);
    if (options.type === "source") return;
    validateShape(record, options);
    var signature = JSON.stringify(options);
    if (signature === record.structuralSignature) return;
    if (typeof record.rebuild === "function") record.rebuild(clone(options));
    else if (record.instance && typeof record.instance.update === "function") {
      record.instance.update(clone(options));
    }
    record.structuralSignature = signature;
  }

  function applyPresentation(record, effective) {
    var values = effective.values;
    var root = record.root;
    var surface = values.surface || {};
    var axes = values.axes || {};
    var legend = values.legend || {};
    var labels = values.labels || {};
    var tooltip = values.tooltip || {};
    var seriesDefaults = values.series_defaults || {};
    var animation = values.animation || {};
    var interaction = values.interaction || {};
    setToken(root, "--st-chart-surface", surface.background);
    setToken(root, "--st-chart-card", surface.card_background || surface.background);
    setToken(root, "--st-chart-border", surface.border_color);
    setToken(root, "--st-chart-border-width", surface.border_width, "px");
    setToken(root, "--st-chart-radius", surface.radius, "px");
    setToken(root, "--st-chart-padding", surface.padding, "px");
    setToken(root, "--st-chart-shadow", shadowValue(surface.shadow));
    setToken(root, "--st-chart-axis", axes.axis_color);
    setToken(root, "--st-chart-grid", axes.grid_color);
    setToken(root, "--st-chart-grid-width", axes.grid_width, "px");
    setToken(root, "--st-chart-axis-label", axes.label_color);
    setToken(root, "--st-chart-axis-label-size", axes.label_size, "px");
    setToken(root, "--st-chart-axis-rotation", axes.label_rotation, "deg");
    setToken(root, "--st-chart-legend", legend.text_color);
    setToken(root, "--st-chart-legend-size", legend.text_size, "px");
    setToken(root, "--st-chart-label", labels.text_color);
    setToken(root, "--st-chart-label-size", labels.font_size, "px");
    setToken(root, "--st-chart-tooltip-bg", tooltip.background);
    setToken(root, "--st-chart-tooltip-text", tooltip.text_color);
    setToken(root, "--st-chart-tooltip-border", tooltip.border_color);
    setToken(root, "--st-chart-tooltip-border-width", tooltip.border_width, "px");
    setToken(root, "--st-chart-line-width", seriesDefaults.line_width, "px");
    setToken(root, "--st-chart-fill-opacity", (seriesDefaults.fill_opacity == null ? 28 : seriesDefaults.fill_opacity) / 100);
    setToken(root, "--st-chart-series-opacity", (seriesDefaults.opacity == null ? 100 : seriesDefaults.opacity) / 100);
    setToken(root, "--st-chart-point-size", seriesDefaults.point_size, "px");
    setToken(root, "--st-chart-bar-width", seriesDefaults.bar_width, "px");
    setToken(root, "--st-chart-bar-radius", seriesDefaults.bar_radius, "px");
    setToken(root, "--st-chart-bar-gap", seriesDefaults.bar_gap, "%");
    setToken(root, "--st-chart-animation-duration", animation.duration, "ms");
    setToken(root, "--st-chart-animation-easing", animation.easing);
    var palette = Array.isArray(seriesDefaults.palette) ? seriesDefaults.palette : [];
    (record.series || []).forEach(function (series, index) {
      var owned = (values.series || {})[series.key] || {};
      var color = owned.color || seriesDefaults.color || palette[index % Math.max(1, palette.length)];
      setToken(root, "--st-chart-series-" + index, color);
      setToken(root, "--st-chart-series-fill-" + index, owned.fill_color || seriesDefaults.fill_color || color);
      setToken(root, "--st-chart-series-width-" + index, owned.line_width == null ? seriesDefaults.line_width : owned.line_width, "px");
      setToken(root, "--st-chart-series-opacity-" + index, (owned.opacity == null ? (seriesDefaults.opacity == null ? 100 : seriesDefaults.opacity) : owned.opacity) / 100);
    });
    if (root.dataset) {
      root.dataset.stChartLegend = legend.visible === false ? "hidden" : "visible";
      root.dataset.stChartAxes = axes.x_visible === false && axes.y_visible === false ? "hidden" : "visible";
      root.dataset.stChartLabels = labels.data_labels_visible ? "visible" : "hidden";
      root.dataset.stChartTooltip = tooltip.visible === false ? "hidden" : "visible";
      root.dataset.stChartHover = interaction.hover_emphasis === false ? "off" : "on";
      root.dataset.stChartSelectable = interaction.selectable_values ? "on" : "off";
      root.dataset.stChartAnimation = animation.enabled === false ? "off" : "on";
      root.dataset.stChartLineStyle = seriesDefaults.line_style || "solid";
      root.dataset.stChartSmooth = seriesDefaults.smooth ? "on" : "off";
      root.dataset.stChartType = (values.chart && values.chart.type) || "source";
    }
  }

  function makeAdapter(kind) {
    return {
      capabilities: {
        kind: kind === "number_card" ? "sparkline" : "full",
        groups: kind === "number_card" ? SPARKLINE_GROUPS.slice() : FULL_GROUPS.slice()
      },
      apply: function (record, effective) {
        if (kind !== "number_card") applyStructure(record, effective.values);
        applyPresentation(record, effective);
      },
      dispose: function (record) {
        if (record && record.root && record.root.dataset) {
          delete record.root.dataset.stChartId;
          delete record.root.dataset.stChartFamily;
        }
      }
    };
  }

  var adapters = {
    dashboard_chart: makeAdapter("dashboard_chart"),
    dashboard_graph: makeAdapter("dashboard_graph"),
    report_chart: makeAdapter("report_chart"),
    number_card: makeAdapter("number_card")
  };

  function applyRecord(record, force) {
    if (!record || !record.root || record.root.isConnected === false) return false;
    if (!force && record.appliedRevision === revision) return true;
    var adapter = record.adapter;
    if (!adapter || typeof adapter.apply !== "function") return false;
    try {
      adapter.apply(record, resolveEffective(record.id));
      record.appliedRevision = revision;
      return true;
    } catch (error) {
      record.appliedRevision = revision;
      warn(record, error);
      return false;
    }
  }

  function register(descriptor) {
    if (!descriptor || !descriptor.id || !descriptor.root) return null;
    var existing = registrations.get(descriptor.id);
    var record = Object.assign(existing || {}, descriptor);
    record.adapter = descriptor.adapter || adapters[descriptor.family] || null;
    record.capabilities = descriptor.capabilities || clone(
      (record.adapter && record.adapter.capabilities) || {}
    );
    record.series = descriptor.series || record.series || seriesFromInstance(descriptor.instance);
    record.appliedRevision = 0;
    registrations.set(record.id, record);
    try {
      if (record.root.dataset) {
        record.root.dataset.stChartId = record.id;
        record.root.dataset.stChartFamily = record.family || "chart";
      }
    } catch (ignored) {}
    applyRecord(record, true);
    return record;
  }

  function unregister(value) {
    var record = typeof value === "string" ? registrations.get(value) : value;
    if (!record) return false;
    if (record.adapter && typeof record.adapter.dispose === "function") {
      try { record.adapter.dispose(record); } catch (error) { warn(record, error); }
    }
    registrations.delete(record.id);
    return true;
  }

  function refresh(options) {
    if (applying) return false;
    applying = true;
    try {
      var force = !!(options && options.force);
      Array.from(registrations.values()).forEach(function (record) {
        if (!record.root || record.root.isConnected === false) unregister(record);
        else applyRecord(record, force);
      });
    } finally {
      applying = false;
    }
    return true;
  }

  function setConfig(nextConfig, nextSchema) {
    if (nextSchema && nextSchema.groups) schema = clone(nextSchema);
    var serialized = JSON.stringify(nextConfig || {});
    if (serialized === JSON.stringify(config || {})) return false;
    config = clone(nextConfig || {});
    revision += 1;
    refresh();
    return true;
  }

  function describe(value) {
    if (typeof value === "string") {
      var byId = registrations.get(value);
      return byId ? {
        id: byId.id,
        family: byId.family,
        root: byId.root,
        capabilities: clone(byId.capabilities || {}),
        series: clone(byId.series || [])
      } : null;
    }
    var found = null;
    registrations.forEach(function (record) {
      if (!found && (record.root === value || (record.root.contains && record.root.contains(value)))) {
        found = record;
      }
    });
    return found ? {
      id: found.id,
      family: found.family,
      root: found.root,
      capabilities: clone(found.capabilities || {}),
      series: clone(found.series || [])
    } : null;
  }

  function closestData(element, selector, keys) {
    var host = element;
    try { host = element && element.closest ? (element.closest(selector) || element) : element; }
    catch (ignored) { host = element; }
    var data = (host && host.dataset) || {};
    for (var index = 0; index < keys.length; index += 1) {
      if (data[keys[index]]) return String(data[keys[index]]);
    }
    return "";
  }

  function routeParts() {
    try {
      var route = frappe.get_route ? frappe.get_route() : [];
      return Array.isArray(route) ? route.map(String) : [];
    } catch (ignored) { return []; }
  }

  function classifyElement(element) {
    var route = routeParts();
    var isNumber = false;
    try {
      isNumber = !!(element.matches && element.matches(".number-card-chart,.number-card .chart-container")) ||
        !!(element.closest && element.closest(".number-card,.number-widget-box,.number-card-widget-box"));
    } catch (ignored) {}
    if (isNumber) return "number_card";
    if (route[0] === "query-report" || route[0] === "Report") return "report_chart";
    if (route[0] === "dashboard-view" || route[0] === "Dashboard") return "dashboard_graph";
    return "dashboard_chart";
  }

  function seriesFromInstance(instance) {
    var datasets = instance && instance.data && instance.data.datasets;
    if (!Array.isArray(datasets)) return [];
    return datasets.map(function (dataset, index) {
      var source = dataset && (dataset.fieldname || dataset.key || dataset.source_key || dataset.name);
      return {
        key: source ? "dataset:" + encodeURIComponent(String(source)) : "session:" + index,
        label: String((dataset && (dataset.label || dataset.name)) || source || ("Series " + (index + 1)))
      };
    });
  }

  function scan(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = [];
    try {
      nodes = Array.from(scope.querySelectorAll(
        ".chart-container,.frappe-chart,.number-card-chart,.dashboard-graph-wrapper"
      ));
    } catch (ignored) { return 0; }
    var added = 0;
    nodes.forEach(function (element) {
      if (!element || element.isConnected === false) return;
      if (element.dataset && element.dataset.stChartId && registrations.has(element.dataset.stChartId)) return;
      var family = classifyElement(element);
      var sourceName = closestData(
        element,
        "[data-chart-name],[data-widget-name],[data-st-chart-source],[data-name]",
        ["chartName", "widgetName", "stChartSource", "name"]
      );
      var route = routeParts();
      var persistable = !!sourceName;
      var segments;
      if (family === "report_chart" && route[1]) {
        segments = [route[1], sourceName || "main"];
        persistable = !!sourceName;
      } else if (family === "dashboard_graph" && route[1]) {
        segments = [route[1], sourceName || "main"];
        persistable = !!sourceName;
      } else {
        segments = [sourceName || ("session-" + (++sessionSequence))];
      }
      var instance = element.__chart || element.chart || null;
      register({
        id: encodeIdentity(family, segments),
        family: family,
        root: element,
        instance: instance,
        source: instance || { data: {} },
        series: seriesFromInstance(instance),
        persistable: persistable
      });
      added += 1;
    });
    return added;
  }

  window.solvronixChartRuntime = {
    register: register,
    unregister: unregister,
    refresh: refresh,
    setConfig: setConfig,
    resolveEffective: resolveEffective,
    describe: describe,
    scan: scan
  };

  function ready() {
    if (typeof MutationObserver === "function" && document.body) {
      observer = new MutationObserver(function () {
        scan();
        refresh({ force: true });
      });
      observer.observe(document.body, { childList: true, subtree: true });
      if (document.documentElement) {
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      }
    }
    if (frappe.router && frappe.router.on) {
      frappe.router.on("change", function () {
        scan();
        refresh({ force: true });
      });
    }
    window.addEventListener("st-theme-runtime-refresh", function (event) {
      var detail = event && event.detail;
      if (detail && detail.config) setConfig(detail.config, detail.chart_schema);
    });
    scan();
    refresh({ force: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
}());
