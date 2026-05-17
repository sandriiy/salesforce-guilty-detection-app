public inherited sharing class GuiltyChartRelationshipService {
    private GuiltyChartMetadataService metadataService;

    public GuiltyChartRelationshipService() {
        this.metadataService = new GuiltyChartMetadataService();
    }

    public List<ChartRelationshipPathDTO> discoverRelationshipPaths(String baseObjectApiName) {
        Schema.DescribeSObjectResult baseObjectDescribe = metadataService.requireAccessibleSObject(baseObjectApiName);
        List<ChartRelationshipPathDTO> relationshipPaths = new List<ChartRelationshipPathDTO>();
        Set<String> seenPathValues = new Set<String>();

        addRelationshipPath(
            relationshipPaths,
            seenPathValues,
            new ChartRelationshipPathDTO(
                'SELF::' + baseObjectDescribe.getName(),
                baseObjectDescribe.getLabel(),
                baseObjectDescribe.getLabelPlural() + ' from the selected base object.',
                baseObjectDescribe.getName(),
                baseObjectDescribe.getLabel(),
                'Id',
                'Record',
                'SELF',
                false,
                null,
                null
            )
        );

        for (Schema.ChildRelationship childRelationship : baseObjectDescribe.getChildRelationships()) {
            addStandardRelationshipPath(baseObjectDescribe, childRelationship, relationshipPaths, seenPathValues);
        }

        for (ChartIdReferenceDefinition definition : getIdReferenceDefinitions()) {
            addIdReferenceRelationshipPath(baseObjectDescribe, definition, relationshipPaths, seenPathValues);
        }

        List<String> sortKeys = new List<String>();
        Map<String, ChartRelationshipPathDTO> pathByKey = new Map<String, ChartRelationshipPathDTO>();
        for (ChartRelationshipPathDTO path : relationshipPaths) {
            String sortKey = path.relationshipType + '|' + path.label.toLowerCase() + '|' + path.value;
            sortKeys.add(sortKey);
            pathByKey.put(sortKey, path);
        }

        sortKeys.sort();
        List<ChartRelationshipPathDTO> sortedPaths = new List<ChartRelationshipPathDTO>();
        for (String sortKey : sortKeys) {
            sortedPaths.add(pathByKey.get(sortKey));
        }

        return sortedPaths;
    }

    private void addStandardRelationshipPath(
        Schema.DescribeSObjectResult baseObjectDescribe,
        Schema.ChildRelationship childRelationship,
        List<ChartRelationshipPathDTO> relationshipPaths,
        Set<String> seenPathValues
    ) {
        if (childRelationship == null || childRelationship.getField() == null) {
            return;
        }

        Schema.DescribeSObjectResult childDescribe = childRelationship.getChildSObject().getDescribe();
        if (!childDescribe.isAccessible() || !childDescribe.isQueryable() || shouldSkipChildObject(childDescribe.getName())) {
            return;
        }

        Schema.DescribeFieldResult fieldDescribe = childRelationship.getField().getDescribe();
        if (!fieldDescribe.isAccessible()) {
            return;
        }

        String pathValue = 'STANDARD::' + childDescribe.getName() + '::' + fieldDescribe.getName();
        String pathLabel = childDescribe.getLabel() + ' via ' + fieldDescribe.getLabel();
        String description = childDescribe.getLabelPlural() + ' linked to ' + baseObjectDescribe.getLabel() + ' through ' + fieldDescribe.getLabel() + '.';

        addRelationshipPath(
            relationshipPaths,
            seenPathValues,
            new ChartRelationshipPathDTO(
                pathValue,
                pathLabel,
                description,
                childDescribe.getName(),
                childDescribe.getLabel(),
                fieldDescribe.getName(),
                fieldDescribe.getLabel(),
                'STANDARD_CHILD',
                false,
                null,
                null
            )
        );
    }

    private void addIdReferenceRelationshipPath(
        Schema.DescribeSObjectResult baseObjectDescribe,
        ChartIdReferenceDefinition definition,
        List<ChartRelationshipPathDTO> relationshipPaths,
        Set<String> seenPathValues
    ) {
        Schema.DescribeSObjectResult sourceDescribe;
        Schema.DescribeFieldResult sourceFieldDescribe;

        try {
            sourceDescribe = metadataService.requireAccessibleSObject(definition.sourceObjectApiName);
            sourceFieldDescribe = metadataService.requireAccessibleField(definition.sourceObjectApiName, definition.sourceFieldApiName);
            if (!String.isBlank(definition.typeDiscriminatorFieldApiName)) {
                metadataService.requireAccessibleField(definition.sourceObjectApiName, definition.typeDiscriminatorFieldApiName);
            }
        } catch (Exception ex) {
            return;
        }

        String pathValue = 'IDREF::' + definition.sourceObjectApiName + '::' + definition.sourceFieldApiName;
        String description = definition.description + ' Matching is scoped to ' + baseObjectDescribe.getLabel() + ' records.';

        addRelationshipPath(
            relationshipPaths,
            seenPathValues,
            new ChartRelationshipPathDTO(
                pathValue,
                definition.label,
                description,
                sourceDescribe.getName(),
                sourceDescribe.getLabel(),
                sourceFieldDescribe.getName(),
                sourceFieldDescribe.getLabel(),
                'ID_REFERENCE',
                true,
                definition.typeDiscriminatorFieldApiName,
                baseObjectDescribe.getName()
            )
        );
    }

    private void addRelationshipPath(
        List<ChartRelationshipPathDTO> relationshipPaths,
        Set<String> seenPathValues,
        ChartRelationshipPathDTO relationshipPath
    ) {
        if (seenPathValues.contains(relationshipPath.value)) {
            return;
        }

        relationshipPaths.add(relationshipPath);
        seenPathValues.add(relationshipPath.value);
    }

    private Boolean shouldSkipChildObject(String objectApiName) {
        return objectApiName.endsWith('History')
            || objectApiName.endsWith('Feed')
            || objectApiName.endsWith('Share')
            || objectApiName.endsWith('ChangeEvent');
    }

    private List<ChartIdReferenceDefinition> getIdReferenceDefinitions() {
        return new List<ChartIdReferenceDefinition>{
            new ChartIdReferenceDefinition(
                'ReviewFeedback__c',
                'RecordId__c',
                'Record Identifier',
                'RecordType__c',
                'Review Feedback via Record Identifier',
                'Review feedback records linked through a text-based Salesforce ID field.'
            )
        };
    }
}