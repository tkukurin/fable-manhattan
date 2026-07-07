#!/usr/bin/env python3
# /// script
# requires-python = ">=3.14"
# dependencies = [
#     "seaborn>=0.13.2",
# ]
# ///
"""Analyzes JavaScript and HTML files from Fable Manhattan runs.

1. High-level metrics (length, comments, LOC)
2. Linter (eslint) for errors, warnings, inconsistencies
3. Pairwise 3gram Jaccard
4. viz into PNG files:
- `similarity_heatmap.png`: Code overlap between runs.
- `highlevel_metrics.png`: Aggregated code size metrics.
- `linter_metrics.png`: Aggregated linter violations.

`uv run analyze_manhattan.py --dir <dir>`
"""
import argparse
import json
import os
import re
import subprocess
import difflib
from dataclasses import dataclass, field
from pathlib import Path
from html.parser import HTMLParser
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

@dataclass
class Dir: src: Path; files: list[File] = field(default_factory=list)
@dataclass
class File: src: Dir; path: Path; text: str
@dataclass
class AnalyzedFile: analyzer: str; tgt: File; metrics: dict[str, float]

class Extractor(HTMLParser):  # extract `tags` from html file
    def __init__(self, tags: list): super().__init__(); self.tags, self.res, self.on, self.t, self.d = tags, [], 0, "", []
    def handle_starttag(self, t, a):
        if t in self.tags: self.on, self.t, self.d = 1, dict(a).get("type", "").lower(), []
    def handle_data(self, d): self.on and self.d.append(d)
    def handle_endtag(self, t):
        if t in self.tags: self.t == "importmap" or self.res.append("".join(self.d)); self.on = 0

def extract_js_from_file(file: File) -> str:
    """Extracts raw JS from a JS file or JS script blocks from an HTML file."""
    if file.path.suffix == ".js": return file.text
    extractor = Extractor(["script"]); extractor.feed(file.text)
    return "\n".join(extractor.res)

def analyze_highlevel(file: File) -> AnalyzedFile:
    """high-level text metrics: length, number of comments, number of LOCs."""
    js_code = extract_js_from_file(file)
    pattern = re.compile(  # match strings, regexes, comments wout overlapping.
        r'(\"(?:[^\"\\\\]|\\\\.)*\")|'
        r'(\'(?:[^\'\\\\]|\\\\.)*\')|'
        r'(\`(?:[^\`\\\\]|\\\\.)*\`)|'
        r'(/\*[\s\S]*?\*/)|'
        r'(//.*)'
    )
    comments = []
    def repl(match):
        val = match.group(0)
        if val.startswith("/*") or val.startswith("//"):
            comments.append(val)
            return ""
        return val

    clean_code = pattern.sub(repl, js_code)
    loc = sum(1 for line in clean_code.splitlines() if line.strip())
    metrics = {
        "length": len(js_code),
        "comments": len(comments),
        "loc": loc,
        "total_lines": len(js_code.splitlines())
    }
    return AnalyzedFile(analyzer="highlevel", tgt=file, metrics=metrics)

def analyze_linter(file: File) -> AnalyzedFile:
    """Lints and extracts: warnings, errors, and inconsistencies."""
    js_code = extract_js_from_file(file)
    temp_file = Path(f".temp_lint_{file.path.name}.js")
    temp_file.write_text(js_code, encoding="utf-8")
    errors = 0
    warnings = 0
    inconsistencies = 0
    try:
        res = subprocess.run(
            ["npx", "--yes", "eslint", "--format", "json", str(temp_file)],
            capture_output=True, text=True
        )
        output_str = res.stdout.strip()
        if output_str:
            data = json.loads(output_str)
            if data and isinstance(data, list):
                messages = data[0].get("messages", [])
                for msg in messages:
                    rule_id = msg.get("ruleId")
                    severity = msg.get("severity")
                    if severity == 2:
                        errors += 1
                    elif severity == 1:
                        # Style / inconsistency rules
                        if rule_id in ["semi", "quotes", "curly", "eqeqeq"]:
                            inconsistencies += 1
                        else:
                            warnings += 1
    except Exception as e:
        print(f"Error running eslint on {file.path}: {e}")
    finally:
        if temp_file.exists():
            temp_file.unlink()
    metrics = {
        "errors": errors,
        "warnings": warnings,
        "inconsistencies": inconsistencies
    }
    return AnalyzedFile(analyzer="eslint", tgt=file, metrics=metrics)

def visualize_similarity(dirs: list[Dir]) -> plt.Figure:
    """Computes pairwise trigram Jaccard similarities and plots a heatmap."""
    runs = sorted(d.src.name for d in dirs)
    n = len(dirs)
    matrix = np.ones((n, n))
    js_by_dir = {}
    for d in dirs:
        js_texts = []
        # Sort files to ensure deterministic concatenation order
        for f in sorted(d.files, key=lambda f: f.path):
            js_texts.append(extract_js_from_file(f))
        js_by_dir[d.src.name] = "\n".join(js_texts)
    print("\nCalculating pairwise trigram Jaccard similarities...")
    for i in range(n):
        for j in range(i + 1, n):
            run_i, run_j = runs[i], runs[j]
            def get_trigrams(text: str) -> set[str]:
                clean = "".join(text.split())
                return {clean[idx:idx+3] for idx in range(len(clean) - 2)}
            t1 = get_trigrams(js_by_dir[run_i])
            t2 = get_trigrams(js_by_dir[run_j])
            ratio = len(t1 & t2) / len(t1 | t2) if (t1 or t2) else 0.0
            matrix[i, j] = ratio
            matrix[j, i] = ratio
            print(f"  {run_i} vs {run_j}: {ratio:.4f}")
    df = pd.DataFrame(matrix, index=runs, columns=runs)
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(df, annot=True, cmap="YlGnBu", fmt=".4f", cbar_kws={'label': 'Similarity Ratio'}, ax=ax)
    ax.set_title("Pairwise Code Similarity Heatmap")
    plt.tight_layout()
    return fig

def visualize_highlevel(analyzed_files: list[AnalyzedFile]) -> plt.Figure:
    """Plots folder-level aggregated high-level metrics."""
    # Group by folder
    data = []
    for af in analyzed_files:
        run_name = af.tgt.src.src.name
        data.append({
            "run": run_name,
            "length": af.metrics["length"],
            "comments": af.metrics["comments"],
            "loc": af.metrics["loc"]
        })
    df = pd.DataFrame(data).groupby("run").sum().reset_index()
    df = df.sort_values("run")
    df_melt = df.melt(  # for seaborn grouped plot
        id_vars="run", value_vars=["length", "comments", "loc"],
        var_name="metric", value_name="count")
    fig, ax = plt.subplots(figsize=(10, 6))
    sns.barplot(data=df_melt, x="run", y="count", hue="metric", ax=ax, palette="muted")
    ax.set_yscale("log")  # Log scale since length and comments/LOC are orders of magnitude apart
    ax.set_title("High-level Code Metrics by Run (Log Scale)")
    ax.set_ylabel("Count"); ax.set_xlabel("Fable Level Run")
    plt.tight_layout()
    return fig

def visualize_linter(analyzed_files: list[AnalyzedFile]) -> plt.Figure:
    """Plots folder-level aggregated linter metrics."""
    data = []
    for af in analyzed_files:
        run_name = af.tgt.src.src.name
        data.append({
            "run": run_name,
            "errors": af.metrics["errors"],
            "warnings": af.metrics["warnings"],
            "inconsistencies": af.metrics["inconsistencies"]
        })
    df = pd.DataFrame(data).groupby("run").sum().reset_index()
    df = df.sort_values("run")
    df_melt = df.melt(
        id_vars="run", value_vars=["errors", "warnings", "inconsistencies"],
        var_name="metric", value_name="count")
    fig, ax = plt.subplots(figsize=(10, 6))
    sns.barplot(data=df_melt, x="run", y="count", hue="metric", ax=ax, palette="deep")
    ax.set_title("Linter Metrics by Run")
    ax.set_ylabel("Count")
    ax.set_xlabel("Fable Level Run")
    plt.tight_layout()
    return fig

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ind", default=".")
    parser.add_argument("--out", default="out/")
    args = parser.parse_args(); based = Path(args.ind); outd = Path(args.out)
    dirs = []
    for run_path in based.glob("run-*"):
        d = Dir(src=run_path)
        html_files = list(run_path.glob("index.html"))
        js_files = list(run_path.glob("js/**/*.js")) + list(run_path.glob("js/*.js"))
        file_paths = sorted(set(html_files + js_files))
        for file_path in file_paths:
            text = file_path.read_text(encoding="utf-8")
            f = File(src=d, path=file_path, text=text)
            d.files.append(f)
        dirs.append(d)
    highlevel_results = []
    linter_results = []
    print("\nAnalyzing code files...")
    for d in dirs:
        print(f"Processing folder: {d.src.name}")
        for f in d.files:
            hl = analyze_highlevel(f)
            lint = analyze_linter(f)
            highlevel_results.append(hl)
            linter_results.append(lint)
            print(f"{f.path.relative_to(based)}")
            kv = lambda kv: f"{kv[0]},{kv[1]}"
            print(",".join(map(kv, hl.metrics.items())))
            print(",".join(map(kv, lint.metrics.items())))

    sns.set_theme(style="whitegrid", context="talk")
    # 1. Similarity heatmap
    fig_sim = visualize_similarity(dirs)
    fig_sim.savefig(outd/"similarity_heatmap.png", dpi=150)
    plt.close(fig_sim)

    fig_hl = visualize_highlevel(highlevel_results)
    fig_hl.savefig(outd/"highlevel_metrics.png", dpi=150)
    plt.close(fig_hl)

    fig_lint = visualize_linter(linter_results)
    fig_lint.savefig(outd/"linter_metrics.png", dpi=150)
    plt.close(fig_lint)

