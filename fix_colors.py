#!/usr/bin/env python3
"""Bulk replace raw Tailwind color classes with CashTraka brand tokens."""
import os, re, glob

replacements = {
    'green': 'success',
    'blue': 'brand',
    'lime': 'success',
    'emerald': 'success',
    'amber': 'owed',
    'yellow': 'owed',
    'cyan': 'brand',
    'teal': 'brand',
}

tw_prefixes = [
    'bg-', 'text-', 'border-', 'ring-', 'outline-',
    'from-', 'to-', 'via-',
    'divide-', 'placeholder-', 'accent-', 'caret-', 'fill-', 'stroke-',
    'decoration-',
    'hover:bg-', 'hover:text-', 'hover:border-', 'hover:ring-',
    'focus:bg-', 'focus:text-', 'focus:border-', 'focus:ring-',
    'active:bg-', 'active:text-',
    'group-hover:bg-', 'group-hover:text-',
    'dark:bg-', 'dark:text-', 'dark:border-',
]

old_colors = '|'.join(replacements.keys())
prefix_pattern = '|'.join(re.escape(p) for p in tw_prefixes)
# Use word-boundary-like lookbehind/lookahead without \!
pattern = re.compile(
    r'(' + prefix_pattern + r')(' + old_colors + r')-(\d{2,3})\b'
)

def replace_color(match):
    prefix = match.group(1)
    old_color = match.group(2)
    shade = match.group(3)
    new_color = replacements.get(old_color, old_color)
    return f'{prefix}{new_color}-{shade}'

extensions = ['*.tsx', '*.ts', '*.css']
files = []
for ext in extensions:
    files.extend(glob.glob(f'src/**/{ext}', recursive=True))

total_changes = 0
changed_files = 0

for filepath in sorted(files):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    new_content = pattern.sub(replace_color, content)

    if new_content == content:
        continue

    changes = len(pattern.findall(content))
    total_changes += changes
    changed_files += 1

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f'  {filepath}: {changes} replacements')

print(f'\nTotal: {total_changes} replacements across {changed_files} files')
