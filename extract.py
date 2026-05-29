import json
import os

log_path = r"C:\Users\Lakshmi Siv Prasad\.gemini\antigravity\brain\af29d0db-1ba1-4e3f-935b-e5ec0370491e\.system_generated\logs\transcript.jsonl"
out_path = r"C:\Users\Lakshmi Siv Prasad\.gemini\antigravity\scratch\ev-charging-finder\dashboard_history.txt"

history = []

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        if 'OperatorDashboard.jsx' in line:
            try:
                step = json.loads(line)
                
                if 'tool_calls' in step:
                    for tc in step['tool_calls']:
                        args = tc.get('arguments', {})
                        name = tc.get('name', '')
                        if 'OperatorDashboard' in str(args):
                            history.append(f"--- TOOL CALL: {name} ---")
                            history.append(json.dumps(args, indent=2))
                
                if 'tool_responses' in step:
                    for tr in step['tool_responses']:
                        out = tr.get('output', '')
                        if 'OperatorDashboard' in out:
                            history.append(f"--- TOOL RESPONSE ---")
                            # We only append a snippet of the response to keep it manageable
                            history.append(out[:1000] + "\n...[truncated]...\n" + out[-1000:])
            except Exception as e:
                history.append(f"Error parsing line: {e}")

with open(out_path, 'w', encoding='utf-8') as f:
    f.write("\n".join(history))

print(f"Extraction complete. Wrote {len(history)} lines to dashboard_history.txt")
