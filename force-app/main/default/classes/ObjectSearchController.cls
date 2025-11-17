public with sharing class ObjectSearchController {
    @AuraEnabled(cacheable=true)
    public static List<String> getObjects() {
        Map<String, Schema.SObjectType> g = Schema.getGlobalDescribe();
        List<String> names = new List<String>(g.keySet());
        names.sort();
        return names;
    }

    @AuraEnabled(cacheable=true)
    public static List<String> getFields(String objectName) {
        if (String.isBlank(objectName)) return new List<String>();
        Schema.SObjectType t = Schema.getGlobalDescribe().get(objectName);
        if (t == null) return new List<String>();

        Map<String, Schema.SObjectField> m = t.getDescribe().fields.getMap();
        List<String> out = new List<String>(m.keySet());
        out.sort();
        return out;
    }


    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getPreviewData(String objectName, List<String> fields) {

        if (String.isBlank(objectName) || fields == null || fields.isEmpty()) {
            return new List<Map<String, Object>>();
        }

        String soql = 'SELECT ' + String.join(fields, ',') +' FROM ' + objectName;
        List<SObject> records = Database.query(soql);
        List<Map<String, Object>> response = new List<Map<String, Object>>();

        for (SObject s : records) {
            Map<String, Object> row = new Map<String, Object>();

            for (String f : fields) {
                Object val = extractFieldValue(s, f);
                if (val == null) val = '—';
                row.put(f, val);
            }
            response.add(row);
        }

        return response;
    }


    private static Object extractFieldValue(SObject record, String fieldPath) {

        if (record == null || String.isBlank(fieldPath)) return null;

        String[] parts = fieldPath.split('\\.');
        SObject currentObj = record;
        Object value;

        for (Integer i = 0; i < parts.size(); i++) {

            String part = parts[i];

            if (i == parts.size() - 1) {
                try {
                    value = currentObj.get(part);
                } catch (Exception e) {
                    return null;
                }
                return value;
            }

            try {
                currentObj = currentObj.getSObject(part);
            } catch (Exception e) {
                return null;
            }

            if (currentObj == null) return null;
        }

        return null;
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getFieldsWithRelationships(String objectName) {

        List<Map<String, Object>> out = new List<Map<String, Object>>();
        if (String.isBlank(objectName)) return out;

        Schema.SObjectType t = Schema.getGlobalDescribe().get(objectName);
        if (t == null) return out;

        Map<String, Schema.SObjectField> fields = t.getDescribe().fields.getMap();

        for (String name : fields.keySet()) {

            Schema.DescribeFieldResult d = fields.get(name).getDescribe();
            Map<String, Object> fieldData = new Map<String, Object>();

            fieldData.put('name', name);
            fieldData.put('label', d.getLabel());
            fieldData.put('type', d.getType().name());
            fieldData.put('isLookup', d.getType() == Schema.DisplayType.Reference);

            List<String> refs = new List<String>();
            if (d.getType() == Schema.DisplayType.Reference) {
                for (Schema.SObjectType r : d.getReferenceTo()) {
                    refs.add(r.getDescribe().getName());
                }
            }

            fieldData.put('referenceObjects', refs);
            out.add(fieldData);
        }

        return out;
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getChildObjectFields(String objectName) {
        return getFieldsWithRelationships(objectName);
    }
}
