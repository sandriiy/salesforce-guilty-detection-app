public with sharing class GuiltyChartMetadataService {
    private static final Set<Schema.DisplayType> GROUPABLE_DISPLAY_TYPES = new Set<Schema.DisplayType>{
        Schema.DisplayType.STRING,
        Schema.DisplayType.PICKLIST,
        Schema.DisplayType.COMBOBOX,
        Schema.DisplayType.MULTIPICKLIST,
        Schema.DisplayType.ID,
        Schema.DisplayType.REFERENCE,
        Schema.DisplayType.BOOLEAN,
        Schema.DisplayType.DATE,
        Schema.DisplayType.DATETIME,
        Schema.DisplayType.INTEGER,
        Schema.DisplayType.DOUBLE,
        Schema.DisplayType.CURRENCY,
        Schema.DisplayType.PERCENT,
        Schema.DisplayType.PHONE,
        Schema.DisplayType.EMAIL,
        Schema.DisplayType.URL
    };

    private static final Set<Schema.DisplayType> AGGREGATABLE_DISPLAY_TYPES = new Set<Schema.DisplayType>{
        Schema.DisplayType.INTEGER,
        Schema.DisplayType.DOUBLE,
        Schema.DisplayType.CURRENCY,
        Schema.DisplayType.PERCENT
    };

    public List<SObjectFieldDTO> getGroupableFields(String objectApiName) {
        Schema.SObjectType objectType = Schema.getGlobalDescribe().get(objectApiName);
        if (objectType == null) return new List<SObjectFieldDTO>();

        Schema.DescribeSObjectResult objectDescribe = objectType.getDescribe();
        if (!objectDescribe.isAccessible()) return new List<SObjectFieldDTO>();

        List<SObjectFieldDTO> unsortedFields = new List<SObjectFieldDTO>();
        for (Schema.SObjectField field : objectDescribe.fields.getMap().values()) {
            Schema.DescribeFieldResult fd = field.getDescribe();
            if (!fd.isAccessible()) continue;
            if (!GROUPABLE_DISPLAY_TYPES.contains(fd.getType())) continue;

            String referenceTo = null;
            if (fd.getType() == Schema.DisplayType.REFERENCE && !fd.getReferenceTo().isEmpty()) {
                referenceTo = String.valueOf(fd.getReferenceTo()[0]);
            }
            unsortedFields.add(new SObjectFieldDTO(fd.getLabel(), fd.getName(), String.valueOf(fd.getType()), referenceTo));
        }

        return sortFieldsByLabel(unsortedFields);
    }

    public List<SObjectFieldDTO> getAggregatableFields(String objectApiName) {
        Schema.SObjectType objectType = Schema.getGlobalDescribe().get(objectApiName);
        if (objectType == null) return new List<SObjectFieldDTO>();

        Schema.DescribeSObjectResult objectDescribe = objectType.getDescribe();
        if (!objectDescribe.isAccessible()) return new List<SObjectFieldDTO>();

        List<SObjectFieldDTO> unsortedFields = new List<SObjectFieldDTO>();
        for (Schema.SObjectField field : objectDescribe.fields.getMap().values()) {
            Schema.DescribeFieldResult fd = field.getDescribe();
            if (!fd.isAccessible()) continue;
            if (!AGGREGATABLE_DISPLAY_TYPES.contains(fd.getType())) continue;

            unsortedFields.add(new SObjectFieldDTO(fd.getLabel(), fd.getName(), String.valueOf(fd.getType()), null));
        }

        return sortFieldsByLabel(unsortedFields);
    }

    public SObjectFieldDTO describeField(String objectApiName, String fieldApiName) {
        Schema.SObjectType objectType = Schema.getGlobalDescribe().get(objectApiName);
        if (objectType == null) return null;

        Map<String, Schema.SObjectField> fieldMap = objectType.getDescribe().fields.getMap();
        Schema.SObjectField field = fieldMap.get(fieldApiName.toLowerCase());
        if (field == null) return null;

        Schema.DescribeFieldResult fd = field.getDescribe();
        if (!fd.isAccessible()) return null;

        String referenceTo = null;
        if (fd.getType() == Schema.DisplayType.REFERENCE && !fd.getReferenceTo().isEmpty()) {
            referenceTo = String.valueOf(fd.getReferenceTo()[0]);
        }
        return new SObjectFieldDTO(fd.getLabel(), fd.getName(), String.valueOf(fd.getType()), referenceTo);
    }

    private List<SObjectFieldDTO> sortFieldsByLabel(List<SObjectFieldDTO> fields) {
        List<String> sortedLabels = new List<String>();
        Map<String, SObjectFieldDTO> fieldByLabel = new Map<String, SObjectFieldDTO>();

        for (SObjectFieldDTO f : fields) {
            sortedLabels.add(f.label);
            fieldByLabel.put(f.label, f);
        }
        sortedLabels.sort();

        List<SObjectFieldDTO> sorted = new List<SObjectFieldDTO>();
        for (String label : sortedLabels) {
            sorted.add(fieldByLabel.get(label));
        }
        return sorted;
    }
}
