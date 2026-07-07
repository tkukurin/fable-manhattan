#!/usr/bin/env python3
"""downloads files from url to folders in `.`

the page is:
"""
URL = "https://fable-manhattan.surge.sh"
RUNS = ["run-a", "run-b", "run-c", "run-d", "run-e"]

import argparse
import os
import urllib.request
import urllib.parse
from html.parser import HTMLParser

class AssetParser(HTMLParser):
    def __init__(self): super().__init__(); self.assets = set()
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if "src" in attrs_dict: self.assets.add(attrs_dict["src"])
        if "href" in attrs_dict: self.assets.add(attrs_dict["href"])

def is_local_path(url):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme or parsed.netloc: return False
    if url.startswith("//") or url.startswith("data:") or url.startswith("javascript:"):
        return False
    return True

def download_file(url, filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    print(f"Downloading {url} -> {filepath}")
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
        with open(filepath, "wb") as f:
            f.write(response.read())

def fetch_manhattan(base_url, in_dirs, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    main_url = urllib.parse.urljoin(base_url, "index.html")
    main_path = os.path.join(out_dir, "index.html")
    download_file(main_url, main_path)
    for run in in_dirs:
        run_dir = os.path.join(out_dir, run)
        os.makedirs(run_dir, exist_ok=True)
        run_url = urllib.parse.urljoin(base_url, f"{run}/index.html")
        run_index_path = os.path.join(run_dir, "index.html")
        download_file(run_url, run_index_path)
        # Parse local assets from the run's index.html
        with open(run_index_path, "r", encoding="utf-8") as f:
            html_content = f.read()

        parser = AssetParser()
        parser.feed(html_content)
        for asset in filter(is_local_path, parser.assets):
            # Clean up any query parameters or hashes
            clean_asset = urllib.parse.urlparse(asset).path
            # Absolute download URL
            asset_url = urllib.parse.urljoin(base_url, f"{run}/{clean_asset}")
            asset_path = os.path.join(run_dir, clean_asset)
            download_file(asset_url, asset_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch Fable Manhattan assets.")
    parser.add_argument("--base-url", default=URL, help="Base URL to fetch from.")
    parser.add_argument("--in",  action="append", dest="in_dirs")
    parser.add_argument("--out-dir", default=".", help="Output directory.")
    args = parser.parse_args()
    fetch_manhattan(args.base_url, args.in_dirs or RUNS, args.out_dir)

