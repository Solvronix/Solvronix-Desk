from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = [l.strip() for l in f if l.strip() and not l.startswith("#")]

setup(
	name="solvronix_desk",
	version="1.0.0",
	description="Professional white-label theme for Frappe/ERPNext",
	author="Solvronix",
	author_email="sales@solvronix.com",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires,
)
