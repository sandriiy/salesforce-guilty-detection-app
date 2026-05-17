public class ChartRelationshipPathDTO {
    @AuraEnabled
    public String value;
    @AuraEnabled
    public String label;
    @AuraEnabled
    public String description;
    @AuraEnabled
    public String sourceObjectApiName;
    @AuraEnabled
    public String sourceObjectLabel;
    @AuraEnabled
    public String sourceFieldApiName;
    @AuraEnabled
    public String sourceFieldLabel;
    @AuraEnabled
    public String relationshipType;
    @AuraEnabled
    public Boolean usesIdReference;
    @AuraEnabled
    public String typeDiscriminatorFieldApiName;
    @AuraEnabled
    public String typeDiscriminatorValue;

    public ChartRelationshipPathDTO(
        String value,
        String label,
        String description,
        String sourceObjectApiName,
        String sourceObjectLabel,
        String sourceFieldApiName,
        String sourceFieldLabel,
        String relationshipType,
        Boolean usesIdReference,
        String typeDiscriminatorFieldApiName,
        String typeDiscriminatorValue
    ) {
        this.value = value;
        this.label = label;
        this.description = description;
        this.sourceObjectApiName = sourceObjectApiName;
        this.sourceObjectLabel = sourceObjectLabel;
        this.sourceFieldApiName = sourceFieldApiName;
        this.sourceFieldLabel = sourceFieldLabel;
        this.relationshipType = relationshipType;
        this.usesIdReference = usesIdReference;
        this.typeDiscriminatorFieldApiName = typeDiscriminatorFieldApiName;
        this.typeDiscriminatorValue = typeDiscriminatorValue;
    }
}