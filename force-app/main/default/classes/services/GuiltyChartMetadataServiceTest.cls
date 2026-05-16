@isTest
private class GuiltyChartMetadataServiceTest {
    @isTest
    static void getGroupableFields_withValidObject_returnsAccessibleFields() {
        GuiltyChartMetadataService service = new GuiltyChartMetadataService();

        Test.startTest();
        List<SObjectFieldDTO> fields = service.getGroupableFields('ReviewFeedback__c');
        Test.stopTest();

        Assert.isNotNull(fields);
        Assert.isTrue(fields.size() > 0);
    }

    @isTest
    static void getGroupableFields_withInvalidObject_returnsEmptyList() {
        GuiltyChartMetadataService service = new GuiltyChartMetadataService();

        Test.startTest();
        List<SObjectFieldDTO> fields = service.getGroupableFields('NonExistentObject__c');
        Test.stopTest();

        Assert.areEqual(0, fields.size());
    }

    @isTest
    static void getAggregatableFields_withValidObject_returnsNumericFields() {
        GuiltyChartMetadataService service = new GuiltyChartMetadataService();

        Test.startTest();
        List<SObjectFieldDTO> fields = service.getAggregatableFields('ReviewProcess__c');
        Test.stopTest();

        Assert.isNotNull(fields);
        for (SObjectFieldDTO field : fields) {
            Boolean isNumeric = field.type == 'INTEGER' || field.type == 'DOUBLE'
                || field.type == 'CURRENCY' || field.type == 'PERCENT';
            Assert.isTrue(isNumeric, 'Field ' + field.name + ' should be a numeric type');
        }
    }

    @isTest
    static void describeField_withExistingField_returnsFieldDTO() {
        GuiltyChartMetadataService service = new GuiltyChartMetadataService();

        Test.startTest();
        SObjectFieldDTO field = service.describeField('ReviewFeedback__c', 'Assessment__c');
        Test.stopTest();

        Assert.isNotNull(field);
        Assert.areEqual('Assessment__c', field.name);
    }

    @isTest
    static void describeField_withNonExistentField_returnsNull() {
        GuiltyChartMetadataService service = new GuiltyChartMetadataService();

        Test.startTest();
        SObjectFieldDTO field = service.describeField('ReviewFeedback__c', 'FieldThatDoesNotExist__c');
        Test.stopTest();

        Assert.isNull(field);
    }

    @isTest
    static void getGroupableFields_resultIsSortedByLabel() {
        GuiltyChartMetadataService service = new GuiltyChartMetadataService();

        Test.startTest();
        List<SObjectFieldDTO> fields = service.getGroupableFields('ReviewFeedback__c');
        Test.stopTest();

        for (Integer i = 1; i < fields.size(); i++) {
            Assert.isTrue(
                fields.get(i - 1).label <= fields.get(i).label,
                'Fields should be sorted by label'
            );
        }
    }
}
