public class ReviewProcessController {
    @AuraEnabled
    public static void saveReviewProcessFilter(Id reviewProcessId, String compiledData) {
        ReviewProcess__c reviewProcess = new ReviewProcess__c(
            Id = reviewProcessId,
            FilterCriteria__c = compiledData,
            isFilterCriteriaCompleted__c = true
        );

        try {
            update reviewProcess;
        } catch (DMLException ex) {
            // log
            System.debug(ex.getMessage());
        }
    }

    @AuraEnabled
    public static void saveReviewProcessFields(Id reviewProcessId, String compiledData) {
        ReviewProcess__c reviewProcess = new ReviewProcess__c(
            Id = reviewProcessId,
            FieldsForReview__c = compiledData,
            isFieldsForReviewCompleted__c = true
        );

        try {
            update reviewProcess;
        } catch (DMLException ex) {
            // log
            System.debug(ex.getMessage());
        }
    }

    @AuraEnabled
    public static void moveReviewProcessToNextStage(Id reviewProcessId, String newStatus) {
        ReviewProcess__c reviewProcess = new ReviewProcess__c(
            Id = reviewProcessId,
            Status__c = newStatus
        );

        try {
            update reviewProcess;
        } catch (DMLException ex) {
            // log
            System.debug(ex.getMessage());
        }
    }

    @AuraEnabled
    public static List<String> verifyReviewProcessReadiness(Id reviewProcessId) {
        List<String> errors = new List<String>();
        ReviewProcess__c reviewProcess = new ReviewProcessSelector().selectById(reviewProcessId);

        if (reviewProcess.StartDateTime__c < System.now()) {
            errors.add('Start Date/Time cannot be in the past');
        }

        if (reviewProcess.EndDateTime__c < System.now()) {
            errors.add('End Date/Time cannot be in the past');
        }

        return errors;
    }

    @AuraEnabled(cacheable=true)
    public static ReviewProcessNextStepDTO getReviewProcessNextStep(Id reviewProcessId) {
        ReviewProcess__c reviewProcess = new ReviewProcessSelector().selectById(reviewProcessId);

        if (String.isBlank(reviewProcess.FilterCriteria__c)) {
            return new ReviewProcessNextStepDTO(
                'Define Type & Filter',
                false
            );
        } else if (String.isBlank(reviewProcess.FieldsForReview__c)) {
            return new ReviewProcessNextStepDTO(
                'Define Review Fields',
                false
            );
        } else if (reviewProcess.StartDateTime__c == null || reviewProcess.EndDateTime__c == null) {
            return new ReviewProcessNextStepDTO(
                'Define Start/End Dates',
                false
            );
        } else {
            return new ReviewProcessNextStepDTO(
                'Good To Go',
                true
            );
        }
    }

    @AuraEnabled
    public static List<EntityDefinition> getSObjectsBySearch(String searchQuery) {
        return [
            SELECT Label, QualifiedApiName 
            FROM EntityDefinition
            WHERE Label LIKE :('%' + String.escapeSingleQuotes(searchQuery) + '%')
            ORDER BY QualifiedApiName LIMIT 200
        ];
    }

    @AuraEnabled
    public static List<SObjectFieldDTO> getAllSObjectFields(String sObjectName) {
        Schema.SObjectType objType = Schema.getGlobalDescribe().get(sObjectName);

        if (objType == null) {
            throw new IllegalArgumentException('Invalid SObject name: ' + sObjectName);
        } else {
            Map<String, Schema.SObjectField> fieldMap = objType.getDescribe().fields.getMap();
            return transformFieldsToDtos(fieldMap);
        }
    }

    @AuraEnabled
    public static List<PicklistValueDTO> getPicklistValues(String sObjectName, String fieldName) {
        List<PicklistValueDTO> picklistValues = new List<PicklistValueDTO>();
        
        Schema.DescribeSObjectResult objDescribe = Schema.getGlobalDescribe().get(sObjectName).getDescribe();
        Schema.DescribeFieldResult fieldDescribe = objDescribe.fields.getMap().get(fieldName).getDescribe();
        
        if (fieldDescribe != null && fieldDescribe.getType() == Schema.DisplayType.Picklist) {
            for (Schema.PicklistEntry entry : fieldDescribe.getPicklistValues()) {
                picklistValues.add(new PicklistValueDTO(entry.getLabel(), entry.getValue()));
            }
        }
        
        return picklistValues;
    }

    private static List<SObjectFieldDTO> transformFieldsToDtos(Map<String, Schema.SObjectField> fields) {
        List<SObjectFieldDTO> fieldDTOs = new List<SObjectFieldDTO>();

        for (Schema.SObjectField field : fields.values()) {
            Schema.DescribeFieldResult fieldDescribe = field.getDescribe();
            fieldDTOs.add(new SObjectFieldDTO(
                fieldDescribe.getLabel(),
                fieldDescribe.getName(),
                String.valueOf(fieldDescribe.getType()),
                retrieveRelationSobject(fieldDescribe)
            ));
        }

        return fieldDTOs;
    }

    private static String retrieveRelationSobject(Schema.DescribeFieldResult fieldDescribe) {
        if (fieldDescribe.getType() == Schema.DisplayType.REFERENCE) {
            List<Schema.SObjectType> referenceTo = fieldDescribe.getReferenceTo();
            if (!referenceTo.isEmpty()) {
                // Extracting object name
                return referenceTo[0].getDescribe().getName();
            }
        } else if (fieldDescribe.getName() == 'Id') {
            // The Id field always refers to the object itself
            return fieldDescribe.getSObjectField().getDescribe().getSObjectType().getDescribe().getName();
        }

        return null;
    }
}