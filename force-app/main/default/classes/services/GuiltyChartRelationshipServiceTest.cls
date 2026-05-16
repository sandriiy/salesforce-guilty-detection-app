@isTest
private class GuiltyChartRelationshipServiceTest {
    @isTest
    static void discoverRelationshipPaths_withValidObject_returnsNonEmptyList() {
        GuiltyChartRelationshipService service = new GuiltyChartRelationshipService();
        GuiltyChartMetadataService metadataService = new GuiltyChartMetadataService();

        Test.startTest();
        List<ChartAnalyticsContextDTO.RelationshipPathDTO> paths =
            service.discoverRelationshipPaths('ReviewProcess__c', metadataService);
        Test.stopTest();

        Assert.isNotNull(paths);
        Assert.isTrue(paths.size() > 0);
    }

    @isTest
    static void discoverRelationshipPaths_withInvalidObject_returnsEmptyList() {
        GuiltyChartRelationshipService service = new GuiltyChartRelationshipService();
        GuiltyChartMetadataService metadataService = new GuiltyChartMetadataService();

        Test.startTest();
        List<ChartAnalyticsContextDTO.RelationshipPathDTO> paths =
            service.discoverRelationshipPaths('NonExistentObject__c', metadataService);
        Test.stopTest();

        Assert.areEqual(0, paths.size());
    }

    @isTest
    static void discoverRelationshipPaths_withAccountBase_includesIdBasedReference() {
        GuiltyChartRelationshipService service = new GuiltyChartRelationshipService();
        GuiltyChartMetadataService metadataService = new GuiltyChartMetadataService();

        Test.startTest();
        List<ChartAnalyticsContextDTO.RelationshipPathDTO> paths =
            service.discoverRelationshipPaths('Account', metadataService);
        Test.stopTest();

        Boolean hasIdBasedRef = false;
        for (ChartAnalyticsContextDTO.RelationshipPathDTO path : paths) {
            if (path.isIdBasedReference) {
                hasIdBasedRef = true;
                Assert.areEqual('ReviewFeedback__c', path.sourceObjectApiName);
                Assert.areEqual('RecordId__c', path.joinFieldApiName);
                Assert.isTrue(path.key.contains('.__id__.'));
                break;
            }
        }

        Assert.isTrue(hasIdBasedRef, 'Account should expose ReviewFeedback__c as an ID-based reference path');
    }

    @isTest
    static void discoverRelationshipPaths_standardPath_hasCorrectKeyFormat() {
        GuiltyChartRelationshipService service = new GuiltyChartRelationshipService();
        GuiltyChartMetadataService metadataService = new GuiltyChartMetadataService();

        Test.startTest();
        List<ChartAnalyticsContextDTO.RelationshipPathDTO> paths =
            service.discoverRelationshipPaths('ReviewProcess__c', metadataService);
        Test.stopTest();

        for (ChartAnalyticsContextDTO.RelationshipPathDTO path : paths) {
            if (!path.isIdBasedReference) {
                Assert.isFalse(path.key.contains('.__id__.'), 'Standard path key should not contain .__id__.');
                Assert.isNotNull(path.joinFieldApiName);
                Assert.isNotNull(path.availableGroupByFields);
            }
        }
    }
}
