/* Solvronix chart runtime: scoped chart registration and theme reapplication. */
(function () {
  "use strict";

  var config = (window.frappe && frappe.boot && frappe.boot.st_theme_config) || {};
  var schema = (window.frappe && frappe.boot && frappe.boot.st_chart_schema) || { groups: {} };
  var registrations = new Map();
  var revision = 1;
  var applying = false;
  var observer = null;

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
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
        capabilities: clone(byId.capabilities || {})
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
      capabilities: clone(found.capabilities || {})
    } : null;
  }

  window.solvronixChartRuntime = {
    register: register,
    unregister: unregister,
    refresh: refresh,
    setConfig: setConfig,
    resolveEffective: resolveEffective,
    describe: describe
  };

  function ready() {
    if (typeof MutationObserver === "function" && document.body) {
      observer = new MutationObserver(function () { refresh({ force: true }); });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    if (frappe.router && frappe.router.on) {
      frappe.router.on("change", function () { refresh({ force: true }); });
    }
    window.addEventListener("st-theme-runtime-refresh", function (event) {
      var detail = event && event.detail;
      if (detail && detail.config) setConfig(detail.config, detail.chart_schema);
    });
    refresh({ force: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
}());
