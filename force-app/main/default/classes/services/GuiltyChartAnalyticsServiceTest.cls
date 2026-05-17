@isTest
private class GuiltyChartAnalyticsServiceTest {
    @isTest
    static void getChartAnalyticsContext_discoversStandardAndIdReferencePaths() {
        ChartAnalyticsRequestWrapper reviewProcessRequest = new ChartAnalyticsRequestWrapper();
        reviewProcessRequest.baseObjectApiName = 'ReviewProcess__c';

        ChartAnalyticsContextDTO reviewProcessContext = new GuiltyChartAnalyticsService()
            .getChartAnalyticsContext(reviewProcessRequest);

        System.assertEquals('ReviewProcess__c', reviewProcessContext.baseObjectApiName);
        System.assertEquals(
            true,
            containsRelationshipPath(reviewProcessContext.relationshipPaths, 'STANDARD::ReviewFeedback__c::ReviewProcessId__c'),
            'Review process analytics should expose the standard child relationship to review feedback.'
        );
        System.assertEquals(
            true,
            containsRelationshipPath(reviewProcessContext.relationshipPaths, 'SELF::ReviewProcess__c'),
            'Review process analytics should expose the self path.'
        );
        System.assertEquals(
            false,
            reviewProcessContext.baseFilterableFields.isEmpty(),
            'Base filterable fields should be available for the selected base object.'
        );

        ChartAnalyticsRequestWrapper accountRequest = new ChartAnalyticsRequestWrapper();
        accountRequest.baseObjectApiName = 'Account';

        ChartAnalyticsContextDTO accountContext = new GuiltyChartAnalyticsService()
            .getChartAnalyticsContext(accountRequest);

        System.assertEquals(
            true,
            containsRelationshipPath(accountContext.relationshipPaths, 'IDREF::ReviewFeedback__c::RecordId__c'),
            'Account analytics should expose the configured ID-based relationship path.'
        );
    }

    @isTest
    static void getChartDataset_buildsIdReferenceDatasetWithBaseFilters() {
        Account includedAccount = new Account(Name = 'Analytics Included Account');
        Account excludedAccount = new Account(Name = 'Analytics Excluded Account');
        insert new List<Account>{ includedAccount, excludedAccount };

        ReviewProcess__c reviewProcess = createReviewProcess();
        insert reviewProcess;

        insert new List<ReviewFeedback__c>{
            new ReviewFeedback__c(
                Assessment__c = 'Bad',
                RecordId__c = includedAccount.Id,
                RecordType__c = 'Account',
                ReviewProcessId__c = reviewProcess.Id
            ),
            new ReviewFeedback__c(
                Assessment__c = 'Good',
                RecordId__c = includedAccount.Id,
                RecordType__c = 'Account',
                ReviewProcessId__c = reviewProcess.Id
            ),
            new ReviewFeedback__c(
                Assessment__c = 'Bad',
                RecordId__c = excludedAccount.Id,
                RecordType__c = 'Account',
                ReviewProcessId__c = reviewProcess.Id
            )
        };

        ChartAnalyticsRequestWrapper request = new ChartAnalyticsRequestWrapper();
        request.baseObjectApiName = 'Account';
        request.selectedRelationshipPath = 'IDREF::ReviewFeedback__c::RecordId__c';
        request.groupByFieldApiName = 'Assessment__c';
        request.aggregationType = 'COUNT';
        request.chartType = 'bar';
        request.baseFilterConditions = new List<ReviewFilterCriteriaWrapper.FilterField>{
            buildEqualsFilter('Name', 'Analytics Included Account')
        };
        request.baseFilterLogic = '0';

        ChartDatasetResponseDTO response = new GuiltyChartAnalyticsService().getChartDataset(request);
        Map<String, Decimal> valuesByLabel = mapDataset(response);

        System.assertEquals(true, response.usesIdReference, 'The dataset should identify the ID-based reference path.');
        System.assertEquals('ReviewFeedback__c', response.sourceObjectApiName);
        System.assertEquals(2, response.labels.size(), 'Only matching account feedback records should be counted.');
        System.assertEquals(1, valuesByLabel.get('Bad'));
        System.assertEquals(1, valuesByLabel.get('Good'));
    }

    @isTest
    static void getChartDataset_rejectsInvalidFieldsAndChartTypes() {
        ChartAnalyticsRequestWrapper invalidFieldRequest = new ChartAnalyticsRequestWrapper();
        invalidFieldRequest.baseObjectApiName = 'Account';
        invalidFieldRequest.selectedRelationshipPath = 'SELF::Account';
        invalidFieldRequest.groupByFieldApiName = 'DoesNotExist__c';
        invalidFieldRequest.aggregationType = 'COUNT';
        invalidFieldRequest.chartType = 'bar';

        try {
            new GuiltyChartAnalyticsService().getChartDataset(invalidFieldRequest);
            System.assert(false, 'Expected invalid field validation to throw an exception.');
        } catch (Exception ex) {
            System.assert(ex.getMessage().contains('Invalid field'));
        }

        ChartAnalyticsRequestWrapper invalidChartTypeRequest = new ChartAnalyticsRequestWrapper();
        invalidChartTypeRequest.baseObjectApiName = 'Account';
        invalidChartTypeRequest.selectedRelationshipPath = 'SELF::Account';
        invalidChartTypeRequest.groupByFieldApiName = 'Name';
        invalidChartTypeRequest.aggregationType = 'COUNT';
        invalidChartTypeRequest.chartType = 'scatter';

        try {
            new GuiltyChartAnalyticsService().getChartDataset(invalidChartTypeRequest);
            System.assert(false, 'Expected unsupported chart type validation to throw an exception.');
        } catch (Exception ex) {
            System.assert(ex.getMessage().contains('Unsupported chart type'));
        }
    }

    @isTest
    static void getChartDataset_returnsEmptyDatasetMessageWhenBaseFiltersExcludeRecords() {
        Account accountRecord = new Account(Name = 'Empty Dataset Account');
        insert accountRecord;

        ReviewProcess__c reviewProcess = createReviewProcess();
        insert reviewProcess;

        insert new ReviewFeedback__c(
            Assessment__c = 'Bad',
            RecordId__c = accountRecord.Id,
            RecordType__c = 'Account',
            ReviewProcessId__c = reviewProcess.Id
        );

        ChartAnalyticsRequestWrapper request = new ChartAnalyticsRequestWrapper();
        request.baseObjectApiName = 'Account';
        request.selectedRelationshipPath = 'IDREF::ReviewFeedback__c::RecordId__c';
        request.groupByFieldApiName = 'Assessment__c';
        request.aggregationType = 'COUNT';
        request.chartType = 'bar';
        request.baseFilterConditions = new List<ReviewFilterCriteriaWrapper.FilterField>{
            buildEqualsFilter('Name', 'No Matching Account')
        };
        request.baseFilterLogic = '0';

        ChartDatasetResponseDTO response = new GuiltyChartAnalyticsService().getChartDataset(request);

        System.assertEquals(true, response.labels.isEmpty());
        System.assertEquals('No data matches the current analytics configuration.', response.message);
    }

    @isTest
    static void getChartDataset_appliesBaseFiltersForSelfRelationship() {
        insert new List<Account>{
            new Account(Name = 'Self Filter Included Account'),
            new Account(Name = 'Self Filter Excluded Account')
        };

        ChartAnalyticsRequestWrapper request = new ChartAnalyticsRequestWrapper();
        request.baseObjectApiName = 'Account';
        request.selectedRelationshipPath = 'SELF::Account';
        request.groupByFieldApiName = 'Name';
        request.aggregationType = 'COUNT';
        request.chartType = 'bar';
        request.baseFilterConditions = new List<ReviewFilterCriteriaWrapper.FilterField>{
            buildEqualsFilter('Name', 'Self Filter Included Account')
        };
        request.baseFilterLogic = '0';

        ChartDatasetResponseDTO response = new GuiltyChartAnalyticsService().getChartDataset(request);

        System.assertEquals(new List<String>{ 'Self Filter Included Account' }, response.labels);
        System.assertEquals(1, response.datasets[0].values[0]);
    }

    private static Boolean containsRelationshipPath(List<ChartRelationshipPathDTO> relationshipPaths, String pathValue) {
        for (ChartRelationshipPathDTO relationshipPath : relationshipPaths) {
            if (relationshipPath.value == pathValue) {
                return true;
            }
        }

        return false;
    }

    private static ReviewProcess__c createReviewProcess() {
        return new ReviewProcess__c(
            EndDateTime__c = System.now().addDays(2),
            Name = 'Analytics Review Process',
            StartDateTime__c = System.now().addDays(1),
            Status__c = 'Draft'
        );
    }

    private static ReviewFilterCriteriaWrapper.FilterField buildEqualsFilter(String fieldName, String value) {
        ReviewFilterCriteriaWrapper.FilterField filterCondition = new ReviewFilterCriteriaWrapper.FilterField();
        filterCondition.field = fieldName;
        filterCondition.selectedCondition = 'equals';
        filterCondition.type = 'text';
        filterCondition.value = value;
        return filterCondition;
    }

    private static Map<String, Decimal> mapDataset(ChartDatasetResponseDTO response) {
        Map<String, Decimal> valuesByLabel = new Map<String, Decimal>();
        List<Decimal> values = response.datasets.isEmpty() ? new List<Decimal>() : response.datasets[0].values;

        for (Integer index = 0; index < response.labels.size(); index++) {
            valuesByLabel.put(response.labels[index], values[index]);
        }

        return valuesByLabel;
    }
}