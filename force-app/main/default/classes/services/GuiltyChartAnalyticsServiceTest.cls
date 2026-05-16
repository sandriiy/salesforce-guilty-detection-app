@isTest
private class GuiltyChartAnalyticsServiceTest {
    @isTest
    static void getContext_withValidObject_returnsPopulatedContext() {
        GuiltyChartAnalyticsService service = new GuiltyChartAnalyticsService();

        Test.startTest();
        ChartAnalyticsContextDTO context = service.getContext('ReviewProcess__c');
        Test.stopTest();

        Assert.isNotNull(context);
        Assert.areEqual('ReviewProcess__c', context.baseObjectApiName);
        Assert.isNotNull(context.baseObjectLabel);
        Assert.isNotNull(context.availableChartTypes);
        Assert.isTrue(context.availableChartTypes.size() > 0);
        Assert.isNotNull(context.availableRelationshipPaths);
    }

    @isTest
    static void getContext_withInvalidObject_returnsEmptyPaths() {
        GuiltyChartAnalyticsService service = new GuiltyChartAnalyticsService();

        Test.startTest();
        ChartAnalyticsContextDTO context = service.getContext('NonExistentObject__c');
        Test.stopTest();

        Assert.isNotNull(context);
        Assert.areEqual(0, context.availableRelationshipPaths.size());
        Assert.isNotNull(context.availableChartTypes);
    }

    @isTest
    static void buildDataset_withInvalidSourceObject_returnsWarning() {
        ChartAnalyticsRequestWrapper chartRequest = new ChartAnalyticsRequestWrapper();
        chartRequest.baseObjectApiName = 'ReviewProcess__c';
        chartRequest.sourceObjectApiName = 'NonExistentObject__c';
        chartRequest.groupByFieldApiName = 'Status__c';
        chartRequest.aggregationType = 'COUNT';
        chartRequest.chartType = 'bar';

        GuiltyChartAnalyticsService service = new GuiltyChartAnalyticsService();

        Test.startTest();
        ChartDatasetResponseDTO response = service.buildDataset(chartRequest);
        Test.stopTest();

        Assert.isNotNull(response);
        Assert.isTrue(response.warnings.size() > 0);
        Assert.areEqual(0, response.labels.size());
    }

    @isTest
    static void buildDataset_withInvalidGroupByField_returnsWarning() {
        ChartAnalyticsRequestWrapper chartRequest = new ChartAnalyticsRequestWrapper();
        chartRequest.baseObjectApiName = 'ReviewProcess__c';
        chartRequest.sourceObjectApiName = 'ReviewFeedback__c';
        chartRequest.groupByFieldApiName = 'FieldThatDoesNotExist__c';
        chartRequest.aggregationType = 'COUNT';
        chartRequest.chartType = 'bar';

        GuiltyChartAnalyticsService service = new GuiltyChartAnalyticsService();

        Test.startTest();
        ChartDatasetResponseDTO response = service.buildDataset(chartRequest);
        Test.stopTest();

        Assert.isNotNull(response);
        Assert.isTrue(response.warnings.size() > 0);
    }

    @isTest
    static void buildDataset_withSumAggregationAndNoAggField_returnsWarning() {
        ChartAnalyticsRequestWrapper chartRequest = new ChartAnalyticsRequestWrapper();
        chartRequest.baseObjectApiName = 'ReviewProcess__c';
        chartRequest.sourceObjectApiName = 'ReviewFeedback__c';
        chartRequest.groupByFieldApiName = 'Assessment__c';
        chartRequest.aggregationType = 'SUM';
        chartRequest.aggregationFieldApiName = null;
        chartRequest.chartType = 'bar';

        GuiltyChartAnalyticsService service = new GuiltyChartAnalyticsService();

        Test.startTest();
        ChartDatasetResponseDTO response = service.buildDataset(chartRequest);
        Test.stopTest();

        Assert.isTrue(response.warnings.size() > 0);
    }

    @isTest
    static void getContext_chartTypesIncludeExpectedTypes() {
        GuiltyChartAnalyticsService service = new GuiltyChartAnalyticsService();

        Test.startTest();
        ChartAnalyticsContextDTO context = service.getContext('Account');
        Test.stopTest();

        Set<String> chartTypeValues = new Set<String>();
        for (PicklistValueDTO ct : context.availableChartTypes) {
            chartTypeValues.add(ct.value);
        }

        Assert.isTrue(chartTypeValues.contains('bar'));
        Assert.isTrue(chartTypeValues.contains('pie'));
        Assert.isTrue(chartTypeValues.contains('doughnut'));
        Assert.isTrue(chartTypeValues.contains('line'));
    }

    @isTest
    static void getChartAnalyticsContext_withBlankInput_throwsAuraHandledException() {
        Boolean exceptionThrown = false;

        Test.startTest();
        try {
            GuiltyAdminController.getChartAnalyticsContext('');
        } catch (AuraHandledException ex) {
            exceptionThrown = true;
        }
        Test.stopTest();

        Assert.isTrue(exceptionThrown);
    }

    @isTest
    static void getChartDataset_withBlankInput_throwsAuraHandledException() {
        Boolean exceptionThrown = false;

        Test.startTest();
        try {
            GuiltyAdminController.getChartDataset('');
        } catch (AuraHandledException ex) {
            exceptionThrown = true;
        }
        Test.stopTest();

        Assert.isTrue(exceptionThrown);
    }

    @isTest
    static void getAccessibleSObjects_returnsNonEmptyList() {
        Test.startTest();
        List<PicklistValueDTO> sObjects = GuiltyAdminController.getAccessibleSObjects();
        Test.stopTest();

        Assert.isNotNull(sObjects);
        Assert.isTrue(sObjects.size() > 0);
    }
}
