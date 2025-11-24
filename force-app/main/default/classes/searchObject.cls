public with sharing class searchObject {

    private static final Integer MAX_DEPTH = 5;

    @AuraEnabled(cacheable=true)
    public static List<String> getObjects() {
        List<String> names = new List<String>(Schema.getGlobalDescribe().keySet());
        names.sort();
        return names;
    }

    @AuraEnabled(cacheable=true)
    public static List<String> getFields(String objectName) {
        if (String.isBlank(objectName)) return new List<String>();
        Schema.SObjectType t = Schema.getGlobalDescribe().get(objectName);
        if (t == null) return new List<String>();
        List<String> listFields = new List<String>(t.getDescribe().fields.getMap().keySet());
        listFields.sort();
        return listFields;
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getFieldsWithRelations(String objectName) {
        return describeObjectFields(objectName);
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getRelatedFieldsWithRelations(String relatedObjectName) {
        return describeObjectFields(relatedObjectName);
    }

    private static Map<String, Object> describeObjectFields(String objectName) {
        Map<String, Object> result = new Map<String, Object>();
        if (String.isBlank(objectName)) return result;
        Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
        if (!gd.containsKey(objectName)) return result;
        Schema.DescribeSObjectResult d = gd.get(objectName).getDescribe();

        List<String> defaultFields = new List<String>();
        List<String> parentFields  = new List<String>();
        List<String> childFields   = new List<String>();
        Map<String,String> childObjectMap = new Map<String,String>();

        for (Schema.SObjectField f : d.fields.getMap().values()) {
            Schema.DescribeFieldResult fd = f.getDescribe();
            if (fd.getType() == Schema.DisplayType.REFERENCE) {
                parentFields.add(fd.getName());
            } else {
                defaultFields.add(fd.getName());
            }
        }

        for (Schema.ChildRelationship c : d.getChildRelationships()) {
            if (c.getRelationshipName() != null) {
                childFields.add(c.getRelationshipName());
                childObjectMap.put(c.getRelationshipName(), c.getChildSObject().getDescribe().getName());
            }
        }

        defaultFields.sort();
        parentFields.sort();
        childFields.sort();

        result.put('default',  defaultFields);
        result.put('parents',  parentFields);
        result.put('children', childFields);
        result.put('childrenMap', childObjectMap);

        return result;
    }

    @AuraEnabled(cacheable=true)
    public static String getChildObjectName(String parentObjectName, String relationshipName) {
        if (String.isBlank(parentObjectName) || String.isBlank(relationshipName)) return null;
        Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
        if (!gd.containsKey(parentObjectName)) return null;
        Schema.DescribeSObjectResult d = gd.get(parentObjectName).getDescribe();
        for (Schema.ChildRelationship c : d.getChildRelationships()) {
            if (c.getRelationshipName() != null && c.getRelationshipName().equals(relationshipName)) {
                return c.getChildSObject().getDescribe().getName();
            }
        }
        return null;
    }

    @AuraEnabled(cacheable=true)
    public static List<String> getReferenceToObjects(String objectName, String fieldName) {
        List<String> result = new List<String>();
        if (String.isBlank(objectName) || String.isBlank(fieldName)) return result;
        Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
        if (!gd.containsKey(objectName)) return result;
        Schema.DescribeSObjectResult dsr = gd.get(objectName).getDescribe();
        Map<String, Schema.SObjectField> fieldsMap = dsr.fields.getMap();
        if (!fieldsMap.containsKey(fieldName)) return result;
        List<Schema.SObjectType> refTos = fieldsMap.get(fieldName).getDescribe().getReferenceTo();
        if (refTos != null) {
            for (Schema.SObjectType t : refTos) {
                result.add(t.getDescribe().getName());
            }
        }
        return result;
    }

    @AuraEnabled(cacheable=false)
    public static List<Map<String, Object>> runQuery(String soql) {
        List<Map<String, Object>> result = new List<Map<String, Object>>();
        if (String.isBlank(soql)) return result;
        try {
            List<SObject> records = Database.query(soql);
            for (SObject sobj : records) {
                Map<String, Object> row = new Map<String, Object>();
                for (String fieldName : sobj.getPopulatedFieldsAsMap().keySet()) {
                    row.put(fieldName, sobj.get(fieldName));
                }
                result.add(row);
            }
        } catch (Exception e) {
            throw new AuraHandledException('Error executing SOQL: ' + e.getMessage());
        }
        return result;
    }

    @AuraEnabled
    public static List<Map<String, Object>> previewRecords(String objectName, List<String> fields) {
        if (String.isBlank(objectName) || fields == null || fields.isEmpty()) {
            return new List<Map<String, Object>>();
        }

        Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
        if (!gd.containsKey(objectName)) return new List<Map<String, Object>>();

        Schema.DescribeSObjectResult rootDsr = gd.get(objectName).getDescribe();

        Map<String, String> parentLookupMap = new Map<String, String>();
        for (Schema.SObjectField f : rootDsr.fields.getMap().values()) {
            Schema.DescribeFieldResult fd = f.getDescribe();
            if (fd.getType() == Schema.DisplayType.REFERENCE) {
                String api = fd.getName();
                String relName = api.endsWith('Id') ? api.substring(0, api.length()-2) : api;
                parentLookupMap.put(relName, api);
            }
        }

        Set<String> rootChildSet = new Set<String>();
        for (Schema.ChildRelationship cr : rootDsr.getChildRelationships()) {
            if (cr.getRelationshipName() != null) rootChildSet.add(cr.getRelationshipName());
        }

        List<String> parentSelects = new List<String>();
        Map<String, List<String>> childMap = new Map<String, List<String>>();

        for (String full : fields) {
            if (!full.contains('.')) {
                parentSelects.add(full);
                continue;
            }
            List<String> parts = full.split('\\.');
            String first = parts[0];

            if (parentLookupMap.containsKey(first)) {
                parentSelects.add(full);
            } else if (rootChildSet.contains(first)) {
                if (parts.size() > 1) {
                    List<String> tmp = new List<String>();
                    for (Integer i = 1; i < parts.size(); i++) tmp.add(parts[i]);
                    String remainder = String.join(tmp, '.');

                    if (String.isNotBlank(remainder)) {
                        if (!childMap.containsKey(first)) childMap.put(first, new List<String>());
                        childMap.get(first).add(remainder);
                    }
                }
            } else {
                parentSelects.add(full);
            }
        }

        String selectClause = parentSelects.isEmpty() ? 'Id' : String.join(parentSelects, ',');

        for (String rel : childMap.keySet()) {
            List<String> chFields = childMap.get(rel);
            String sub = buildChildSubquery(objectName, rel, chFields, 1);
            selectClause += ', ' + sub;
        }

        String soql = 'SELECT ' + selectClause + ' FROM ' + objectName;
        System.debug('FINAL SOQL => ' + soql);

        List<SObject> records;
        try {
            records = Database.query(soql);
        } catch (Exception e) {
            throw new AuraHandledException('Preview query failed: ' + e.getMessage());
        }

        List<Map<String, Object>> out = new List<Map<String, Object>>();

        for (SObject sobj : records) {
            Map<String, Object> row = new Map<String, Object>();

            for (String sel : parentSelects) {
                if (!sel.contains('.')) {
                    row.put(sel, sobj.get(sel));
                    continue;
                }

                List<String> parts = sel.split('\\.');
                SObject current = sobj;

                for (Integer i = 0; i < parts.size() - 1; i++) {
                    current = current.getSObject(parts[i]);
                    if (current == null) break;
                }

                Object value = (current != null) ? current.get(parts[parts.size()-1]) : null;

                row.put(sel.replace('.', '_'), value);

            }

            for (String relName : childMap.keySet()) {
                List<SObject> children = sobj.getSObjects(relName);
                List<Map<String, Object>> childOut = new List<Map<String, Object>>();
                if (children != null && !children.isEmpty()) {
                    String childObjectApi = getChildObjectName(objectName, relName);
                    List<String> selChildFields = childMap.get(relName);
                    childOut = buildChildData(children, selChildFields, childObjectApi, 1);
                }
                row.put(relName, childOut);
            }

            out.add(row);
        }

        return out;
    }


    private static String buildChildSubquery(String parentObjectApi, String relName, List<String> fieldsForChild, Integer depth) {
        if (depth >= MAX_DEPTH) {
            if (fieldsForChild == null || fieldsForChild.isEmpty()) {
                return '(SELECT Id FROM ' + relName + ')';
            } else {
                return '(SELECT ' + String.join(fieldsForChild, ',') + ' FROM ' + relName + ')';
            }
        }

        String childApi = getChildObjectName(parentObjectApi, relName);
        if (String.isBlank(childApi)) {
            if (fieldsForChild == null || fieldsForChild.isEmpty()) {
                return '(SELECT Id FROM ' + relName + ')';
            } else {
                return '(SELECT ' + String.join(fieldsForChild, ',') + ' FROM ' + relName + ')';
            }
        }

        Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
        if (!gd.containsKey(childApi)) {
            if (fieldsForChild == null || fieldsForChild.isEmpty()) {
                return '(SELECT Id FROM ' + relName + ')';
            } else {
                return '(SELECT ' + String.join(fieldsForChild, ',') + ' FROM ' + relName + ')';
            }
        }

        Schema.DescribeSObjectResult childDsr = gd.get(childApi).getDescribe();

        Set<String> childChildSet = new Set<String>();
        for (Schema.ChildRelationship cr : childDsr.getChildRelationships()) {
            if (cr.getRelationshipName() != null) childChildSet.add(cr.getRelationshipName());
        }

        List<String> plainFields = new List<String>();
        Map<String, List<String>> nestedChildMap = new Map<String, List<String>>();

        if (fieldsForChild != null && !fieldsForChild.isEmpty()) {
            for (String f : fieldsForChild) {
                if (String.isBlank(f)) continue;
                if (!f.contains('.')) {
                    plainFields.add(f);
                } else {
                    List<String> parts = f.split('\\.');
                    String first = parts[0];
                    if (childChildSet.contains(first)) {
                        List<String> tmp = new List<String>();
                        for (Integer i = 1; i < parts.size(); i++) tmp.add(parts[i]);
                        String remainder = String.join(tmp, '.');
                        if (!nestedChildMap.containsKey(first)) nestedChildMap.put(first, new List<String>());
                        if (String.isNotBlank(remainder)) nestedChildMap.get(first).add(remainder);
                    } else {
                        plainFields.add(f);
                    }
                }
            }
        }

        String sel = plainFields.isEmpty() ? '' : String.join(plainFields, ',');
        for (String nestedRel : nestedChildMap.keySet()) {
            String nestedSub = buildChildSubquery(childApi, nestedRel, nestedChildMap.get(nestedRel), depth + 1);
            if (String.isBlank(sel)) sel = nestedSub;
            else sel += ', ' + nestedSub;
        }

        if (String.isBlank(sel)) {
            if (fieldsForChild == null || fieldsForChild.isEmpty()) {
                return '(SELECT Id FROM ' + relName + ')';
            } else {
                return '(SELECT ' + String.join(fieldsForChild, ',') + ' FROM ' + relName + ')';
            }
        }

        return '(SELECT ' + sel + ' FROM ' + relName + ')';
    }

    private static List<Map<String, Object>> buildChildData(List<SObject> childRecords, List<String> selChildFields, String childObjectApi, Integer depth) {
        List<Map<String, Object>> result = new List<Map<String, Object>>();
        if (childRecords == null || childRecords.isEmpty()) return result;
        if (depth > MAX_DEPTH) {
            for (SObject c : childRecords) {
                Map<String, Object> simple = new Map<String, Object>();
                simple.put('Id', c.get('Id'));
                result.add(simple);
            }
            return result;
        }

        Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
        Schema.DescribeSObjectResult childDsr = (gd.containsKey(childObjectApi) ? gd.get(childObjectApi).getDescribe() : null);

        Set<String> childChildSet = new Set<String>();
        if (childDsr != null) {
            for (Schema.ChildRelationship cr : childDsr.getChildRelationships()) {
                if (cr.getRelationshipName() != null) childChildSet.add(cr.getRelationshipName());
            }
        }

        List<String> plainFields = new List<String>();
        Map<String, List<String>> nestedChildMap = new Map<String, List<String>>();

        if (selChildFields != null && !selChildFields.isEmpty()) {
            for (String cf : selChildFields) {
                if (String.isBlank(cf)) continue;
                if (!cf.contains('.')) {
                    plainFields.add(cf);
                } else {
                    List<String> parts = cf.split('\\.');
                    String first = parts[0];
                    if (childChildSet.contains(first)) {
                        List<String> tmp = new List<String>();
                        for (Integer i = 1; i < parts.size(); i++) tmp.add(parts[i]);
                        String remainder = String.join(tmp, '.');
                        if (!nestedChildMap.containsKey(first)) nestedChildMap.put(first, new List<String>());
                        if (String.isNotBlank(remainder)) nestedChildMap.get(first).add(remainder);
                    } else {
                        plainFields.add(cf);
                    }
                }
            }
        }

        for (SObject childRec : childRecords) {
            Map<String, Object> crow = new Map<String, Object>();
            for (String pf : plainFields) {
                if (!pf.contains('.')) {
                    crow.put(pf, childRec.get(pf));
                } else {
                    List<String> parts = pf.split('\\.');
                    Object cur = childRec;
                    Object value = null;
                    for (Integer i = 0; i < parts.size(); i++) {
                        String seg = parts[i];
                        if (cur == null) { value = null; break; }
                        if (i == parts.size()-1) {
                            if (cur instanceof SObject) value = ((SObject)cur).get(seg);
                            else value = null;
                        } else {
                            if (cur instanceof SObject) cur = ((SObject)cur).getSObject(seg);
                            else cur = null;
                        }
                    }
                    crow.put(pf, value);
                }
            }

            for (String nestedRel : nestedChildMap.keySet()) {
                List<SObject> grandchildren = childRec.getSObjects(nestedRel);
                String grandChildApi = getChildObjectName(childObjectApi, nestedRel);
                List<Map<String, Object>> gdata = buildChildData(grandchildren, nestedChildMap.get(nestedRel), grandChildApi, depth + 1);
                crow.put(nestedRel, gdata);
            }

            result.add(crow);
        }

        return result;
    }

}
