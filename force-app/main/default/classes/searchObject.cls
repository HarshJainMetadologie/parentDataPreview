public with sharing class searchObject {

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
    public static Map<String, List<String>> getFieldsWithRelations(String objectName) {
        Map<String, List<String>> result = new Map<String, List<String>>();
        
        if (String.isBlank(objectName)) return result;

        Schema.SObjectType t = Schema.getGlobalDescribe().get(objectName);
        if (t == null) return result;

        Schema.DescribeSObjectResult d = t.getDescribe();

        List<String> defaultFields = new List<String>();
        List<String> parentFields = new List<String>();
        List<String> childFields = new List<String>();

        for (Schema.SObjectField f : d.fields.getMap().values()) {
            Schema.DescribeFieldResult fd = f.getDescribe();
            if (fd.getType() == Schema.DisplayType.REFERENCE) {
                parentFields.add(fd.getName());
            } else {
                defaultFields.add(fd.getName());
            }
        }

        for (Schema.ChildRelationship c : d.getChildRelationships()) {
            childFields.add(c.getRelationshipName());
        }

        result.put('default', defaultFields);
        result.put('parents', parentFields);
        result.put('children', childFields);

        return result;
    }

}