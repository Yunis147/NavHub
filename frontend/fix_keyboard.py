import re

with open('/home/yunis__147/NavHub/frontend/src/components/KeyboardTeleop.tsx', 'r') as f:
    text = f.read()

target = """      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;"""

replacement = """      const el = e.target as HTMLElement;
      const tag = el?.tagName?.toLowerCase();
      // Ignore keys if the user is typing into any text input or editable element
      if (
        tag === 'input' || 
        tag === 'textarea' || 
        tag === 'select' || 
        tag === 'button' ||
        el?.isContentEditable
      ) {
        return;
      }"""

text = text.replace(target, replacement)

with open('/home/yunis__147/NavHub/frontend/src/components/KeyboardTeleop.tsx', 'w') as f:
    f.write(text)

