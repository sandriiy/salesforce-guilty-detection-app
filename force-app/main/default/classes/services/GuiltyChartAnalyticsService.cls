public inherited sharing class GuiltyChartAnalyticsService {
    private GuiltyChartMetadataService metadataService;
    private GuiltyChartRelationshipService relationshipService;
    private GuiltyChartQueryBuilder queryBuilder;

    public GuiltyChartAnalyticsService() {
        this.metadataService = new GuiltyChartMetadataService();
        this.relationshipService = new GuiltyChartRelationshipService();
        this.queryBuilder = new GuiltyChartQueryBuilder();
    }

    public ChartAnalyticsContextDTO getChartAnalyticsContext(ChartAnalyticsRequestWrapper request) {
        ChartAnalyticsRequestWrapper normalizedRequest = normalizeRequest(request);
        Schema.DescribeSObjectResult baseObjectDescribe = metadataService.requireAccessibleSObject(normalizedRequest.baseObjectApiName);
        List<ChartRelationshipPathDTO> relationshipPaths = relationshipService.discoverRelationshipPaths(normalizedRequest.baseObjectApiName);
        ChartRelationshipPathDTO selectedRelationshipPath = resolveRelationshipPath(relationshipPaths, normalizedRequest.selectedRelationshipPath);

        ChartAnalyticsContextDTO context = new ChartAnalyticsContextDTO();
        context.baseObjectApiName = baseObjectDescribe.getName();
        context.baseObjectLabel = baseObjectDescribe.getLabel();
        context.relationshipPaths = relationshipPaths;
        context.selectedRelationshipPath = selectedRelationshipPath.value;
        context.selectedSourceObjectApiName = selectedRelationshipPath.sourceObjectApiName;
        context.groupByFields = metadataService.getGroupableFields(selectedRelationshipPath.sourceObjectApiName);
        context.baseFilterableFields = metadataService.getFilterableFields(baseObjectDescribe.getName());
        context.filterableFields = metadataService.getFilterableFields(selectedRelationshipPath.sourceObjectApiName);
        context.aggregationFields = metadataService.getAggregationFields(selectedRelationshipPath.sourceObjectApiName);
        context.availableChartTypes = metadataService.getAvailableChartTypes();
        context.aggregationTypes = metadataService.getAggregationTypes();
        context.defaultGroupByFieldApiName = resolveDefaultGroupByField(context.groupByFields);
        context.defaultAggregationType = 'COUNT';
        context.defaultChartType = 'bar';

        return context;
    }

    public ChartDatasetResponseDTO getChartDataset(ChartAnalyticsRequestWrapper request) {
        ChartAnalyticsRequestWrapper normalizedRequest = normalizeRequest(request);
        List<ChartRelationshipPathDTO> relationshipPaths = relationshipService.discoverRelationshipPaths(normalizedRequest.baseObjectApiName);
        ChartRelationshipPathDTO selectedRelationshipPath = resolveRelationshipPath(relationshipPaths, normalizedRequest.selectedRelationshipPath);

        List<SObjectFieldDTO> groupByFields = metadataService.getGroupableFields(selectedRelationshipPath.sourceObjectApiName);
        normalizedRequest.groupByFieldApiName = String.isBlank(normalizedRequest.groupByFieldApiName)
            ? resolveDefaultGroupByField(groupByFields)
            : normalizedRequest.groupByFieldApiName;
        normalizedRequest.aggregationType = String.isBlank(normalizedRequest.aggregationType)
            ? 'COUNT'
            : normalizedRequest.aggregationType.trim().toUpperCase();
        normalizedRequest.chartType = String.isBlank(normalizedRequest.chartType)
            ? 'bar'
            : normalizedRequest.chartType;

        validateChartType(normalizedRequest.chartType);
        List<String> warnings = new List<String>();
        List<AggregateResult> aggregateResults = queryBuilder.runAggregateQuery(
            normalizedRequest,
            selectedRelationshipPath,
            warnings
        );

        return buildDatasetResponse(normalizedRequest, selectedRelationshipPath, aggregateResults, warnings);
    }

    private ChartAnalyticsRequestWrapper normalizeRequest(ChartAnalyticsRequestWrapper request) {
        if (request == null) {
            request = new ChartAnalyticsRequestWrapper();
        }

        request.baseObjectApiName = String.isBlank(request.baseObjectApiName) ? 'ReviewProcess__c' : request.baseObjectApiName;
        request.resultLimit = request.resultLimit == null ? 12 : request.resultLimit;
        return request;
    }

    private ChartRelationshipPathDTO resolveRelationshipPath(
        List<ChartRelationshipPathDTO> relationshipPaths,
        String selectedRelationshipPathValue
    ) {
        for (ChartRelationshipPathDTO relationshipPath : relationshipPaths) {
            if (relationshipPath.value == selectedRelationshipPathValue) {
                return relationshipPath;
            }
        }

        if (relationshipPaths.isEmpty()) {
            throw new IllegalArgumentException('No supported relationships were found for the selected base object.');
        }

        return relationshipPaths.get(0);
    }

    private String resolveDefaultGroupByField(List<SObjectFieldDTO> groupByFields) {
        List<String> preferredFields = new List<String>{
            'Status__c',
            'Assessment__c',
            'RecordType__c',
            'ReviewProcessId__c',
            'ReviewerId__c',
            'Name',
            'Id'
        };

        Set<String> availableFieldNames = new Set<String>();
        for (SObjectFieldDTO fieldDto : groupByFields) {
            availableFieldNames.add(fieldDto.name);
        }

        for (String preferredField : preferredFields) {
            if (availableFieldNames.contains(preferredField)) {
                return preferredField;
            }
        }

        if (groupByFields.isEmpty()) {
            throw new IllegalArgumentException('No groupable fields are available for the selected dataset.');
        }

        return groupByFields.get(0).name;
    }

    private void validateChartType(String chartType) {
        Set<String> supportedChartTypes = new Set<String>{ 'bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea' };
        if (!supportedChartTypes.contains(chartType)) {
            throw new IllegalArgumentException('Unsupported chart type: ' + chartType);
        }
    }

    private ChartDatasetResponseDTO buildDatasetResponse(
        ChartAnalyticsRequestWrapper request,
        ChartRelationshipPathDTO relationshipPath,
        List<AggregateResult> aggregateResults,
        List<String> warnings
    ) {
        ChartDatasetResponseDTO response = new ChartDatasetResponseDTO();
        response.labels = new List<String>();
        response.datasets = new List<ChartDatasetSeriesDTO>();
        response.chartType = request.chartType;
        response.groupByFieldApiName = request.groupByFieldApiName;
        response.groupByFieldLabel = metadataService.requireAccessibleField(
            relationshipPath.sourceObjectApiName,
            request.groupByFieldApiName
        ).getLabel();
        response.aggregationType = request.aggregationType;
        response.aggregationFieldApiName = request.aggregationFieldApiName;
        response.sourceObjectApiName = relationshipPath.sourceObjectApiName;
        response.sourceObjectLabel = relationshipPath.sourceObjectLabel;
        response.relationshipPathValue = relationshipPath.value;
        response.relationshipPathLabel = relationshipPath.label;
        response.usesIdReference = relationshipPath.usesIdReference;
        response.warnings = warnings;

        List<Decimal> metricValues = new List<Decimal>();
        for (AggregateResult aggregateResult : aggregateResults) {
            response.labels.add(resolveLabelValue(aggregateResult.get('groupValue')));
            metricValues.add(resolveMetricValue(aggregateResult.get('metricValue')));
        }

        String datasetLabel = resolveDatasetLabel(request, relationshipPath);
        response.datasets.add(new ChartDatasetSeriesDTO(datasetLabel, metricValues));
        response.message = aggregateResults.isEmpty() ? 'No data matches the current analytics configuration.' : null;

        return response;
    }

    private String resolveDatasetLabel(ChartAnalyticsRequestWrapper request, ChartRelationshipPathDTO relationshipPath) {
        if (request.aggregationType == 'COUNT') {
            return 'Count of ' + relationshipPath.sourceObjectLabel;
        }

        String aggregationFieldLabel = metadataService.requireAccessibleField(
            relationshipPath.sourceObjectApiName,
            request.aggregationFieldApiName
        ).getLabel();

        return request.aggregationType + ' of ' + aggregationFieldLabel;
    }

    private String resolveLabelValue(Object groupValue) {
        if (groupValue == null) {
            return 'Unspecified';
        }

        return String.valueOf(groupValue);
    }

    private Decimal resolveMetricValue(Object metricValue) {
        if (metricValue == null) {
            return 0;
        }

        if (metricValue instanceof Decimal) {
            return (Decimal) metricValue;
        }
        if (metricValue instanceof Integer) {
            return Decimal.valueOf((Integer) metricValue);
        }
        if (metricValue instanceof Long) {
            return Decimal.valueOf((Long) metricValue);
        }
        if (metricValue instanceof Double) {
            return Decimal.valueOf(String.valueOf(metricValue));
        }

        return Decimal.valueOf(String.valueOf(metricValue));
    }
}