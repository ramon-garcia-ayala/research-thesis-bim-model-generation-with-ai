## 2026-10-18 · Summary
Industry Foundation Classes (buildingSMART; ISO 16739): an open, neutral format that describes a building as
objects with properties, so any software can exchange it. Written as STEP text (ISO 10303), one object per line:

    #123=IFCDOOR('2Xa..',#5,'D-01',$,$,#200,#300,$,2.10,0.90,.DOOR.,$,$);
    #124=IFCPROPERTYSINGLEVALUE('FireRating',$,IFCLABEL('EI60'),$);

The same door as a JSON engine would hold it, and a rule result that cites its article (what makes a check
auditable and what a person signs):

    { "type": "door", "id": "D-01", "width": 0.9, "height": 2.1, "fireRating": "EI60", "egress": true }
    { "rule": "egress-door-width", "article": "<code article>", "element": "D-01",
      "value": 0.9, "required": 1.2, "pass": false }
