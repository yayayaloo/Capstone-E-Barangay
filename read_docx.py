import zipfile
import xml.etree.ElementTree as ET
import sys

def dump_xml(path, filename):
    try:
        with zipfile.ZipFile(path) as docx:
            if filename in docx.namelist():
                tree = ET.XML(docx.read(filename))
                namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                for paragraph in tree.findall('.//w:p', namespaces):
                    texts = [node.text for node in paragraph.findall('.//w:t', namespaces) if node.text]
                    if texts:
                        print(''.join(texts))
    except Exception as e:
        print("Error:", e)

print("--- HEADER ---")
dump_xml('public/BARANGAY CLEARANCE.docx', 'word/header1.xml')
dump_xml('public/BARANGAY CLEARANCE.docx', 'word/header2.xml')
dump_xml('public/BARANGAY CLEARANCE.docx', 'word/header3.xml')

print("\n--- DOCUMENT ---")
dump_xml('public/BARANGAY CLEARANCE.docx', 'word/document.xml')

print("\n--- FOOTER ---")
dump_xml('public/BARANGAY CLEARANCE.docx', 'word/footer1.xml')
dump_xml('public/BARANGAY CLEARANCE.docx', 'word/footer2.xml')
