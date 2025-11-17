public with sharing class ObjectInfoController {

    @AuraEnabled(cacheable=true)
    public static List<String> getObjects() {
        return new List<String>(Schema.getGlobalDescribe().keySet());
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getObjectFields(String objectName) {

        Map<String, Schema.SObjectField> fields = Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap();

        List<Map<String, Object>> result = new List<Map<String, Object>>();

        for (String key : fields.keySet()) {

            Schema.DescribeFieldResult f = fields.get(key).getDescribe();

            Boolean isLookup = (f.getReferenceTo() != null && !f.getReferenceTo().isEmpty());
            String refTo = isLookup ? f.getReferenceTo()[0].getDescribe().getName() : null;

            Map<String, Object> row = new Map<String, Object>();
            row.put('label', f.getLabel());
            row.put('apiName', key);
            row.put('type', f.getType());
            row.put('isLookup', isLookup);
            row.put('referenceTo', refTo);

            result.add(row);
        }
        return result;
    }

    @AuraEnabled
    public static List<SObject> getRecords(String objectName, List<String> fields) {
        if (String.isBlank(objectName) || fields == null || fields.isEmpty()) {
            return new List<SObject>();
        }

        String soql = 'SELECT ' + String.join(fields, ',') +' FROM ' + objectName + ' LIMIT 50';

        return Database.query(soql);
    }
}
