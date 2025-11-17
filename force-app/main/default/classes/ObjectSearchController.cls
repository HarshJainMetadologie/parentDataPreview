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
        String soql = 'SELECT ' + String.join(fields, ',') + ' FROM ' + objectName;
        List<SObject> records = Database.query(soql);

        List<Map<String, Object>> result = new List<Map<String, Object>>();

        for (SObject s : records) {
            Map<String, Object> row = new Map<String, Object>();

            for (String f : fields) {
                if (f.contains('.')) {
                    List<String> parts = f.split('\\.');
                    SObject rel = (SObject) s.getSObject(parts[0]);
                    row.put(f, rel != null ? rel.get(parts[1]) : null);
                } else {
                    row.put(f, s.get(f));
                }
            }
            result.add(row);
        }
        return result;
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
            Map<String, Object> f = new Map<String, Object>();

            f.put('name', name);
            f.put('label', d.getLabel());
            f.put('type', d.getType().name());
            f.put('isLookup', d.getType() == Schema.DisplayType.Reference);

            List<String> refs = new List<String>();
            if (d.getType() == Schema.DisplayType.Reference) {
                for (Schema.SObjectType r : d.getReferenceTo()) {
                    refs.add(r.getDescribe().getName());
                }
            }
            f.put('referenceObjects', refs);

            out.add(f);
        }
        return out;
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getChildObjectFields(String objectName) {
        return getFieldsWithRelationships(objectName);
    }
}
