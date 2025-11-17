public with sharing class ObjectExplorerController {

    @AuraEnabled(cacheable=true)
    public static List<String> getObjects() {
        return new List<String>(Schema.getGlobalDescribe().keySet());
    }

    @AuraEnabled(cacheable=true)
    public static List<FieldWrapper> getFields(String objectName) {
        List<FieldWrapper> result = new List<FieldWrapper>();
        if (String.isBlank(objectName)) return result;

        Schema.SObjectType sObj = Schema.getGlobalDescribe().get(objectName);
        if (sObj == null) return result;

        Map<String, Schema.SObjectField> fieldMap = sObj.getDescribe().fields.getMap();

        for (Schema.SObjectField f : fieldMap.values()) {
            Schema.DescribeFieldResult dfr = f.getDescribe();

            FieldWrapper fw = new FieldWrapper();
            fw.apiName = dfr.getName();
            fw.label = dfr.getLabel();
            fw.type = String.valueOf(dfr.getType());
            fw.relatedObject = null;

            if (dfr.getType() == Schema.DisplayType.Reference) {
                List<Schema.SObjectType> refs = dfr.getReferenceTo();
                if (!refs.isEmpty()) {
                    fw.relatedObject = refs[0].getDescribe().getName();
                }
            }

            result.add(fw);
        }
        return result;
    }

    @AuraEnabled
    public static List<Map<String, Object>> getRecords(String objectName, List<String> fieldNames) {
        if (String.isBlank(objectName) || fieldNames == null || fieldNames.isEmpty()) {
            return new List<Map<String, Object>>();
        }

        String query = 'SELECT ' + String.join(fieldNames, ', ') + ' FROM ' + objectName + ' LIMIT 20';
        System.debug('QUERY: ' + query);

        List<SObject> records = Database.query(query);
        List<Map<String, Object>> data = new List<Map<String, Object>>();

        for (SObject s : records) {
            Map<String, Object> row = new Map<String, Object>();
            for (String field : fieldNames) {
                row.put(field, s.get(field));
            }
            data.add(row);
        }
        return data;
    }

    public class FieldWrapper {
        @AuraEnabled public String apiName;
        @AuraEnabled public String label;
        @AuraEnabled public String type;
        @AuraEnabled public String relatedObject;
    }
}
