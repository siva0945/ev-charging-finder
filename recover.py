import json

log_path = r"C:\Users\Lakshmi Siv Prasad\.gemini\antigravity\brain\af29d0db-1ba1-4e3f-935b-e5ec0370491e\.system_generated\logs\transcript.jsonl"
content = None

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        if 'OperatorDashboard.jsx' in line and 'write_to_file' in line:
            try:
                step = json.loads(line)
                for tc in step.get('tool_calls', []):
                    if tc.get('name') == 'default_api:write_to_file':
                        args = tc.get('arguments', {})
                        if 'OperatorDashboard.jsx' in args.get('TargetFile', ''):
                            content = args.get('CodeContent')
            except:
                pass

if content:
    with open('frontend/src/components/OperatorDashboard.jsx', 'w', encoding='utf-8') as out:
        out.write(content)
    print("Successfully restored OperatorDashboard.jsx!")
else:
    print("No write_to_file found for OperatorDashboard.jsx")
