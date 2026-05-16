public with sharing class GuiltyChartRelationshipService {
    private static final Integer MAX_STANDARD_PATHS = 20;

    private static final List<IdReferenceConfig> KNOWN_ID_REFERENCES = new List<IdReferenceConfig>{
        new IdReferenceConfig('ReviewFeedback__c', 'RecordId__c', 'Review Feedback (by Record ID)')
    };

    public List<ChartAnalyticsContextDTO.RelationshipPathDTO> discoverRelationshipPaths(
        String baseObjectApiName,
        GuiltyChartMetadataService metadataService
    ) {
        List<ChartAnalyticsContextDTO.RelationshipPathDTO> paths = new List<ChartAnalyticsContextDTO.RelationshipPathDTO>();

        Schema.SObjectType baseType = Schema.getGlobalDescribe().get(baseObjectApiName);
        if (baseType == null) return paths;

        Schema.DescribeSObjectResult baseDescribe = baseType.getDescribe();
        if (!baseDescribe.isAccessible()) return paths;

        Integer standardPathCount = 0;
        for (Schema.ChildRelationship rel : baseDescribe.getChildRelationships()) {
            if (standardPathCount >= MAX_STANDARD_PATHS) break;

            Schema.SObjectField joinSObjectField = rel.getField();
            if (joinSObjectField == null) continue;

            Schema.SObjectType childType = rel.getChildSObject();
            Schema.DescribeSObjectResult childDescribe = childType.getDescribe();

            if (!childDescribe.isAccessible() || !childDescribe.isQueryable()) continue;

            String childObjectApiName = childDescribe.getName();
            Schema.DescribeFieldResult joinFieldDescribe = joinSObjectField.getDescribe();
            String joinFieldApiName = joinFieldDescribe.getName();
            String joinFieldLabel = joinFieldDescribe.getLabel();

            ChartAnalyticsContextDTO.RelationshipPathDTO path = new ChartAnalyticsContextDTO.RelationshipPathDTO();
            path.key = childObjectApiName + '.' + joinFieldApiName;
            path.label = childDescribe.getLabel() + ' (via ' + joinFieldLabel + ')';
            path.sourceObjectApiName = childObjectApiName;
            path.sourceObjectLabel = childDescribe.getLabel();
            path.isIdBasedReference = false;
            path.joinFieldApiName = joinFieldApiName;
            path.availableGroupByFields = metadataService.getGroupableFields(childObjectApiName);
            path.availableFilterFields = metadataService.getGroupableFields(childObjectApiName);

            paths.add(path);
            standardPathCount++;
        }

        String baseKeyPrefix = baseDescribe.getKeyPrefix();
        for (IdReferenceConfig ref : KNOWN_ID_REFERENCES) {
            Schema.SObjectType refSourceType = Schema.getGlobalDescribe().get(ref.sourceObjectApiName);
            if (refSourceType == null) continue;

            Schema.DescribeSObjectResult refDescribe = refSourceType.getDescribe();
            if (!refDescribe.isAccessible() || !refDescribe.isQueryable()) continue;

            Map<String, Schema.SObjectField> refFields = refDescribe.fields.getMap();
            if (!refFields.containsKey(ref.idFieldApiName.toLowerCase())) continue;

            if (String.isBlank(baseKeyPrefix)) continue;

            ChartAnalyticsContextDTO.RelationshipPathDTO path = new ChartAnalyticsContextDTO.RelationshipPathDTO();
            path.key = ref.sourceObjectApiName + '.__id__.' + ref.idFieldApiName;
            path.label = ref.pathLabel;
            path.sourceObjectApiName = ref.sourceObjectApiName;
            path.sourceObjectLabel = refDescribe.getLabel();
            path.isIdBasedReference = true;
            path.joinFieldApiName = ref.idFieldApiName;
            path.availableGroupByFields = metadataService.getGroupableFields(ref.sourceObjectApiName);
            path.availableFilterFields = metadataService.getGroupableFields(ref.sourceObjectApiName);

            paths.add(path);
        }

        return paths;
    }

    private class IdReferenceConfig {
        String sourceObjectApiName;
        String idFieldApiName;
        String pathLabel;

        IdReferenceConfig(String sourceObjectApiName, String idFieldApiName, String pathLabel) {
            this.sourceObjectApiName = sourceObjectApiName;
            this.idFieldApiName = idFieldApiName;
            this.pathLabel = pathLabel;
        }
    }
}
