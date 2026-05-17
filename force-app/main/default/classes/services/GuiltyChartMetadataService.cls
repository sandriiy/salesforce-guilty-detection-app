public inherited sharing class GuiltyChartMetadataService {
    private static final Set<Schema.DisplayType> GROUPABLE_FIELD_TYPES = new Set<Schema.DisplayType>{
        Schema.DisplayType.Boolean,
        Schema.DisplayType.Currency,
        Schema.DisplayType.Date,
        Schema.DisplayType.DateTime,
        Schema.DisplayType.Double,
        Schema.DisplayType.Email,
        Schema.DisplayType.Id,
        Schema.DisplayType.Integer,
        Schema.DisplayType.Long,
        Schema.DisplayType.Percent,
        Schema.DisplayType.Phone,
        Schema.DisplayType.Picklist,
        Schema.DisplayType.Reference,
        Schema.DisplayType.String,
        Schema.DisplayType.Url
    };

    private static final Set<Schema.DisplayType> AGGREGATE_FIELD_TYPES = new Set<Schema.DisplayType>{
        Schema.DisplayType.Currency,
        Schema.DisplayType.Double,
        Schema.DisplayType.Integer,
        Schema.DisplayType.Long,
        Schema.DisplayType.Percent
    };

    public List<PicklistValueDTO> getAccessibleSObjects() {
        Map<String, Schema.SObjectType> globalDescribe = Schema.getGlobalDescribe();
        List<String> sortKeys = new List<String>();
        Map<String, PicklistValueDTO> optionByKey = new Map<String, PicklistValueDTO>();

        for (String objectApiName : globalDescribe.keySet()) {
            Schema.DescribeSObjectResult objectDescribe = globalDescribe.get(objectApiName).getDescribe();
            if (!objectDescribe.isAccessible() || !objectDescribe.isQueryable()) {
                continue;
            }

            String sortKey = objectDescribe.getLabel().toLowerCase() + '|' + objectDescribe.getName();
            optionByKey.put(sortKey, new PicklistValueDTO(objectDescribe.getLabel(), objectDescribe.getName()));
            sortKeys.add(sortKey);
        }

        sortKeys.sort();
        List<PicklistValueDTO> options = new List<PicklistValueDTO>();
        for (String sortKey : sortKeys) {
            options.add(optionByKey.get(sortKey));
        }

        return options;
    }

    public List<SObjectFieldDTO> getGroupableFields(String sObjectApiName) {
        return collectFields(sObjectApiName, GROUPABLE_FIELD_TYPES, true, false);
    }

    public List<SObjectFieldDTO> getFilterableFields(String sObjectApiName) {
        return collectFields(sObjectApiName, null, false, true);
    }

    public List<SObjectFieldDTO> getAggregationFields(String sObjectApiName) {
        return collectFields(sObjectApiName, AGGREGATE_FIELD_TYPES, false, false);
    }

    public List<PicklistValueDTO> getAvailableChartTypes() {
        return new List<PicklistValueDTO>{
            new PicklistValueDTO('Bar', 'bar'),
            new PicklistValueDTO('Line', 'line'),
            new PicklistValueDTO('Pie', 'pie'),
            new PicklistValueDTO('Doughnut', 'doughnut'),
            new PicklistValueDTO('Radar', 'radar'),
            new PicklistValueDTO('Polar Area', 'polarArea')
        };
    }

    public List<PicklistValueDTO> getAggregationTypes() {
        return new List<PicklistValueDTO>{
            new PicklistValueDTO('Count', 'COUNT'),
            new PicklistValueDTO('Sum', 'SUM'),
            new PicklistValueDTO('Average', 'AVG')
        };
    }

    public List<PicklistValueDTO> getPicklistValues(String sObjectApiName, String fieldApiName) {
        Schema.DescribeFieldResult fieldDescribe = requireAccessibleField(sObjectApiName, fieldApiName);
        List<PicklistValueDTO> picklistValues = new List<PicklistValueDTO>();

        if (fieldDescribe.getType() != Schema.DisplayType.Picklist) {
            return picklistValues;
        }

        for (Schema.PicklistEntry entry : fieldDescribe.getPicklistValues()) {
            picklistValues.add(new PicklistValueDTO(entry.getLabel(), entry.getValue()));
        }

        return picklistValues;
    }

    public Schema.DescribeSObjectResult requireAccessibleSObject(String sObjectApiName) {
        if (String.isBlank(sObjectApiName)) {
            throw new IllegalArgumentException('A base object must be selected.');
        }

        Schema.SObjectType objectType = Schema.getGlobalDescribe().get(sObjectApiName);
        if (objectType == null) {
            throw new IllegalArgumentException('Invalid sObject name: ' + sObjectApiName);
        }

        Schema.DescribeSObjectResult objectDescribe = objectType.getDescribe();
        if (!objectDescribe.isAccessible() || !objectDescribe.isQueryable()) {
            throw new IllegalArgumentException('You do not have access to query ' + sObjectApiName + '.');
        }

        return objectDescribe;
    }

    public Schema.DescribeFieldResult requireAccessibleField(String sObjectApiName, String fieldApiName) {
        if (String.isBlank(fieldApiName)) {
            throw new IllegalArgumentException('A field must be selected on ' + sObjectApiName + '.');
        }

        Schema.DescribeSObjectResult objectDescribe = requireAccessibleSObject(sObjectApiName);
        Map<String, Schema.SObjectField> fieldMap = objectDescribe.fields.getMap();
        if (!fieldMap.containsKey(fieldApiName)) {
            throw new IllegalArgumentException('Invalid field "' + fieldApiName + '" on ' + sObjectApiName + '.');
        }

        Schema.DescribeFieldResult fieldDescribe = fieldMap.get(fieldApiName).getDescribe();
        if (!fieldDescribe.isAccessible()) {
            throw new IllegalArgumentException('You do not have access to field "' + fieldApiName + '" on ' + sObjectApiName + '.');
        }

        return fieldDescribe;
    }

    public void validateFilterFields(String sObjectApiName, List<ReviewFilterCriteriaWrapper.FilterField> filterConditions) {
        if (filterConditions == null || filterConditions.isEmpty()) {
            return;
        }

        for (ReviewFilterCriteriaWrapper.FilterField filterCondition : filterConditions) {
            if (filterCondition == null || String.isBlank(filterCondition.field)) {
                continue;
            }

            Schema.DescribeFieldResult fieldDescribe = requireAccessibleField(sObjectApiName, filterCondition.field);
            if (!fieldDescribe.isFilterable()) {
                throw new IllegalArgumentException('Field "' + filterCondition.field + '" cannot be used for filtering.');
            }
        }
    }

    public Boolean isNumericField(String sObjectApiName, String fieldApiName) {
        return AGGREGATE_FIELD_TYPES.contains(requireAccessibleField(sObjectApiName, fieldApiName).getType());
    }

    private List<SObjectFieldDTO> collectFields(
        String sObjectApiName,
        Set<Schema.DisplayType> allowedTypes,
        Boolean requireGroupable,
        Boolean requireFilterable
    ) {
        Schema.DescribeSObjectResult objectDescribe = requireAccessibleSObject(sObjectApiName);
        Map<String, Schema.SObjectField> fieldMap = objectDescribe.fields.getMap();

        List<String> sortKeys = new List<String>();
        Map<String, SObjectFieldDTO> fieldByKey = new Map<String, SObjectFieldDTO>();
        for (String fieldApiName : fieldMap.keySet()) {
            Schema.DescribeFieldResult fieldDescribe = fieldMap.get(fieldApiName).getDescribe();
            if (!fieldDescribe.isAccessible()) {
                continue;
            }

            if (allowedTypes != null && !allowedTypes.contains(fieldDescribe.getType())) {
                continue;
            }

            if (requireGroupable && !fieldDescribe.isGroupable()) {
                continue;
            }

            if (requireFilterable && !fieldDescribe.isFilterable()) {
                continue;
            }

            String referenceTo = null;
            if (fieldDescribe.getType() == Schema.DisplayType.Reference && !fieldDescribe.getReferenceTo().isEmpty()) {
                referenceTo = fieldDescribe.getReferenceTo().get(0).getDescribe().getName();
            }

            SObjectFieldDTO fieldDto = new SObjectFieldDTO(
                fieldDescribe.getLabel(),
                fieldDescribe.getName(),
                String.valueOf(fieldDescribe.getType()),
                referenceTo
            );

            String sortKey = fieldDescribe.getLabel().toLowerCase() + '|' + fieldDescribe.getName();
            fieldByKey.put(sortKey, fieldDto);
            sortKeys.add(sortKey);
        }

        sortKeys.sort();
        List<SObjectFieldDTO> fieldDtos = new List<SObjectFieldDTO>();
        for (String sortKey : sortKeys) {
            fieldDtos.add(fieldByKey.get(sortKey));
        }

        return fieldDtos;
    }
}