"""Regression checks for shell asset versioning; no third-party dependencies."""
import importlib.util
import pathlib
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location(
    "build_index", pathlib.Path(__file__).with_name("build_index.py"))
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


class ShellVersionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old_root = builder.ROOT
        builder.ROOT = pathlib.Path(self.temp.name)
        self.addCleanup(self.temp.cleanup)
        self.addCleanup(setattr, builder, "ROOT", self.old_root)
        for folder in ("css", "js", "content/subjects"):
            (builder.ROOT / folder).mkdir(parents=True)
        self.write("index.html", '<link href="css/app.css"><script src="js/app.js"></script>\n')
        self.write("css/app.css", "body { color: green; }\n")
        self.write("js/app.js", "const test = 1;\n")

    def write(self, path, text):
        (builder.ROOT / path).write_bytes(text.encode("utf-8"))

    def test_shell_and_precache_use_identical_urls(self):
        builder.update_shell_assets()
        html = (builder.ROOT / "index.html").read_text()
        files = builder.precache_files()
        self.assertIn("./", files)
        self.assertNotIn("index.html", files)
        for asset in builder.APP_ASSETS:
            url = builder.asset_url(asset)
            self.assertIn(url, html)
            self.assertIn(url, files)
            self.assertNotIn(asset, files)
            self.assertEqual(builder.source_path(url), builder.ROOT / asset)

    def test_repeat_build_is_idempotent(self):
        builder.update_shell_assets()
        first = (builder.ROOT / "index.html").read_bytes()
        first_hash = builder.content_hash(builder.precache_files())
        builder.update_shell_assets()
        self.assertEqual(first, (builder.ROOT / "index.html").read_bytes())
        self.assertEqual(first_hash, builder.content_hash(builder.precache_files()))

    def test_edit_changes_url_and_cache_version(self):
        builder.update_shell_assets()
        old_url = builder.asset_url("css/app.css")
        old_hash = builder.content_hash(builder.precache_files())
        self.write("css/app.css", "body { color: violet; }\n")
        builder.update_shell_assets()
        self.assertNotEqual(old_url, builder.asset_url("css/app.css"))
        self.assertNotIn(old_url, (builder.ROOT / "index.html").read_text())
        self.assertNotEqual(old_hash, builder.content_hash(builder.precache_files()))

    def test_line_endings_do_not_change_hashes(self):
        builder.update_shell_assets()
        old_url = builder.asset_url("css/app.css")
        old_hash = builder.content_hash(builder.precache_files())
        for path in ("index.html", "css/app.css", "js/app.js"):
            file = builder.ROOT / path
            file.write_bytes(file.read_bytes().replace(b"\n", b"\r\n"))
        self.assertEqual(old_url, builder.asset_url("css/app.css"))
        self.assertEqual(old_hash, builder.content_hash(builder.precache_files()))

    def test_missing_shell_reference_fails_loudly(self):
        self.write("index.html", '<link href="css/app.css">\n')
        with self.assertRaises(ValueError):
            builder.update_shell_assets()


if __name__ == "__main__":
    unittest.main()
