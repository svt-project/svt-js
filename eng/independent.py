import json
from pathlib import Path
from xml.dom import minidom, Node

def observe(n):
    items=[]
    for c in n.childNodes:
        if c.nodeType in (Node.TEXT_NODE,Node.CDATA_SECTION_NODE):
            if n.nodeType==Node.DOCUMENT_NODE and not c.data.strip(): continue
            if items and isinstance(items[-1],str): items[-1]+=c.data
            elif c.data: items.append(c.data)
        else: items.append(observe(c))
    if n.nodeType==Node.ELEMENT_NODE:
        attrs=sorted([[a.namespaceURI or '',a.localName,a.value] for a in n.attributes.values() if a.namespaceURI!='http://www.w3.org/2000/xmlns/'],key=lambda a:(a[0],a[1]))
        return ['element',n.namespaceURI or '',n.localName,attrs,items]
    if n.nodeType==Node.DOCUMENT_NODE:return ['document',items]
    if n.nodeType==Node.COMMENT_NODE:return ['comment',n.data]
    if n.nodeType==Node.PROCESSING_INSTRUCTION_NODE:return ['pi',n.target,n.data]
    raise ValueError(n.nodeType)

results=[]
for case in json.loads(Path('artifacts/canonical.json').read_text())['outputs']:
    expected=observe(minidom.parseString(case['source']))
    actual=observe(minidom.parseString(case['output']))
    assert actual==expected,case['name']+' independent roundtrip mismatch'
    assert actual==case['semantics'],case['name']+' parser semantic disagreement'
    results.append(case['name'])
Path('artifacts/independent.json').write_text(json.dumps({'parser':'Python minidom / Expat','passed':len(results),'cases':results},indent=2)+'\n')
print('Independent Expat comparisons passed:',len(results))
