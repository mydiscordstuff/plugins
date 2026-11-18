"""Package the source folders and generate the Valenced repository index."""

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import zipfile


ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = os.environ.get("GITHUB_REPOSITORY", "mydiscordstuff/plugins")


def read_files(folder):
    files = {}
    for path in sorted(folder.rglob("*")):
        if path.is_symlink():
            raise ValueError(f"Plugin files must be regular files: {path}")
        if path.is_file():
            files[path.relative_to(folder).as_posix()] = path.read_bytes()
    return files


def package(files, filename, pool):
    # Keep the original ZIP, including its digest, when the source bytes match.
    for existing in sorted(pool.glob(f"*/{filename}")):
        with zipfile.ZipFile(existing) as archive:
            if sorted(archive.namelist()) != sorted(files):
                continue
            if any(archive.read(name) != data for name, data in files.items()):
                continue
        if hashlib.sha256(existing.read_bytes()).hexdigest() != existing.parent.name:
            raise ValueError(f"Published package failed its checksum: {existing}")
        return existing

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        # ZipInfo defaults to 1980-01-01, so filesystem mtimes never change a release.
        for name in sorted(files, key=lambda name: (name != "manifest.json", name)):
            info = zipfile.ZipInfo(name)
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, files[name], compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    data = buffer.getvalue()
    path = pool / hashlib.sha256(data).hexdigest() / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return path


def build_catalog(destination):
    catalog = {
        "format": 1,
        "name": "mydiscordstuff Plugins",
        "description": "Plugins para o Valenced mantidos por mydiscordstuff.",
        "plugins": {},
    }
    for manifest_path in sorted((ROOT / "plugins").glob("*/manifest.json")):
        folder = manifest_path.parent
        if folder.is_symlink():
            raise ValueError(f"Plugin directory must be a regular directory: {folder}")
        files = read_files(folder)
        manifest = json.loads(files["manifest.json"])
        plugin_id, version = manifest["id"], manifest["version"]
        valid_id = re.fullmatch(r"[A-Za-z0-9-][A-Za-z0-9.-]*", plugin_id) and ".." not in plugin_id
        valid_version = re.fullmatch(r"[0-9]+(?:\.[0-9]+)*(?:-[a-z0-9]+)?", version)
        if manifest["format"] != 1 or not valid_id or not valid_version:
            raise ValueError(f"Invalid Valenced manifest format, ID or version in {manifest_path}")
        if plugin_id in catalog["plugins"]:
            raise ValueError(f"Duplicate plugin ID {plugin_id} in {manifest_path}")
        dependencies = manifest["dependencies"]
        for required in ("valenced.api", "discord"):
            if required not in dependencies or dependencies[required].get("optional", False):
                raise ValueError(f"{manifest_path} must require {required}")
        script = manifest.get("dist", {}).get("script")
        if script is not None and script not in files:
            raise ValueError(f"{manifest_path} refers to a missing script: {script}")

        artifact = package(files, f"{plugin_id}@{version}.zip", destination / "pool")
        metadata = {key: manifest[key] for key in ("name", "description", "author")}
        if manifest.get("contributors"):
            metadata["contributors"] = manifest["contributors"]
        metadata["channels"] = {"beta" if "-" in version else "latest": version}
        relative_path = artifact.relative_to(destination).as_posix()
        metadata["versions"] = {
            version: {
                "url": f"https://raw.githubusercontent.com/{REPOSITORY}/packages/{relative_path}",
                "sha256": artifact.parent.name,
                "size": artifact.stat().st_size,
                "dependencies": dependencies,
            }
        }
        catalog["plugins"][plugin_id] = metadata

    encoded = (json.dumps(catalog, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "index.json").write_bytes(encoded)
    (ROOT / "index.json").write_bytes(encoded)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("packages", type=Path, help="checkout of the packages branch")
    build_catalog(parser.parse_args().packages.resolve())
