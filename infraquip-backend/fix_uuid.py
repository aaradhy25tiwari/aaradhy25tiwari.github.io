import os
import re

schema_dir = r"c:\Users\aarad\Desktop\Project\aaradhy25tiwari.github.io\infraquip-backend\app\schemas"

for root, _, files in os.walk(schema_dir):
    for file in files:
        if file.endswith(".py"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            original_content = content
            
            # Replace id: str with id: UUID
            content = re.sub(r'\bid: str\b', 'id: UUID', content)
            
            # Replace _id: str with _id: UUID
            content = re.sub(r'([a-zA-Z0-9_]+_id):\s*str\b', r'\1: UUID', content)
            
            # Replace Optional[str] for IDs
            content = re.sub(r'([a-zA-Z0-9_]+_id):\s*Optional\[str\]', r'\1: Optional[UUID]', content)

            if content != original_content:
                # Add import UUID if not present
                if "from uuid import UUID" not in content and "import uuid" not in content:
                    # Insert after other imports
                    import_idx = content.find("\nclass ")
                    if import_idx != -1:
                        content = content[:import_idx] + "\nfrom uuid import UUID" + content[import_idx:]
                    else:
                        content = "from uuid import UUID\n" + content

                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Updated {file}")
