from setuptools import setup, find_packages

setup(
    name="markanm",
    version="0.1.0a1",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
)
