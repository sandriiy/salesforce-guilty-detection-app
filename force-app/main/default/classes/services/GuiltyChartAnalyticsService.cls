public with sharing class GuiltyChartAnalyticsService {
    private static final List<PicklistValueDTO> SUPPORTED_CHART_TYPES = new List<PicklistValueDTO>{
        new PicklistValueDTO('Bar', 'bar'),
        new PicklistValueDTO('Line', 'line'),
        new PicklistValueDTO('Pie', 'pie'),
        new PicklistValueDTO('Doughnut', 'doughnut'),
        new PicklistValueDTO('Radar', 'radar'),
        new PicklistValueDTO('Polar Area', 'polarArea')
    };

    private static final List<String> COLOR_PALETTE = new List<String>{
        '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
        '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'
    };

    private final GuiltyChartMetadataService metadataService;
    private final GuiltyChartRelationshipService relationshipService;

    public GuiltyChartAnalyticsService() {
        this.metadataService = new GuiltyChartMetadataService();
        this.relationshipService = new GuiltyChartRelationshipService();
    }

    public ChartAnalyticsContextDTO getContext(String baseObjectApiName) {
        ChartAnalyticsContextDTO context = new ChartAnalyticsContextDTO();
        context.availableChartTypes = SUPPORTED_CHART_TYPES;
        context.baseObjectApiName = baseObjectApiName;

        Schema.SObjectType baseType = Schema.getGlobalDescribe().get(baseObjectApiName);
        if (baseType == null) {
            context.baseObjectLabel = baseObjectApiName;
            context.availableRelationshipPaths = new List<ChartAnalyticsContextDTO.RelationshipPathDTO>();
            return context;
        }

        context.baseObjectLabel = baseType.getDescribe().getLabel();
        context.availableRelationshipPaths = relationshipService.discoverRelationshipPaths(baseObjectApiName, metadataService);

        return context;
    }

    public ChartDatasetResponseDTO buildDataset(ChartAnalyticsRequestWrapper chartRequest) {
        ChartDatasetResponseDTO response = new ChartDatasetResponseDTO();
        response.warnings = new List<String>();
        response.labels = new List<String>();
        response.datasets = new List<ChartDatasetResponseDTO.ChartDatasetEntryDTO>();
        response.chartType = String.isBlank(chartRequest.chartType) ? 'bar' : chartRequest.chartType;
        response.sourceObjectApiName = chartRequest.sourceObjectApiName;
        response.groupByFieldApiName = chartRequest.groupByFieldApiName;
        response.relationshipPathKey = chartRequest.relationshipPathKey;
        response.isIdBasedReference = chartRequest.relationshipPathKey != null
            && chartRequest.relationshipPathKey.contains('.__id__.');

        GuiltyChartQueryBuilder.Result queryResult = new GuiltyChartQueryBuilder(chartRequest).execute();

        if (!queryResult.isSuccess) {
            response.warnings.add(queryResult.errorMessage);
            return response;
        }

        response.groupByFieldLabel = queryResult.groupByFieldLabel;

        List<String> labels = new List<String>();
        List<Decimal> data = new List<Decimal>();
        List<String> backgroundColors = new List<String>();

        Integer colorIndex = 0;
        for (AggregateResult ar : queryResult.aggregateResults) {
            Object groupByRaw = ar.get('groupByValue');
            labels.add(groupByRaw != null ? String.valueOf(groupByRaw) : '(Blank)');

            Object valueRaw = ar.get('aggregateValue');
            Decimal value = valueRaw != null ? Decimal.valueOf(String.valueOf(valueRaw)) : 0;
            data.add(value);

            backgroundColors.add(COLOR_PALETTE[Math.mod(colorIndex, COLOR_PALETTE.size())]);
            colorIndex++;
        }

        response.labels = labels;

        ChartDatasetResponseDTO.ChartDatasetEntryDTO dataset = new ChartDatasetResponseDTO.ChartDatasetEntryDTO();
        dataset.label = buildDatasetLabel(chartRequest);
        dataset.data = data;
        dataset.backgroundColor = backgroundColors;
        response.datasets.add(dataset);

        return response;
    }

    private String buildDatasetLabel(ChartAnalyticsRequestWrapper chartRequest) {
        String aggregationType = String.isBlank(chartRequest.aggregationType) ? 'COUNT' : chartRequest.aggregationType.toUpperCase();
        if (aggregationType == 'SUM') return 'Sum of ' + (chartRequest.aggregationFieldApiName != null ? chartRequest.aggregationFieldApiName : '');
        if (aggregationType == 'AVG') return 'Average of ' + (chartRequest.aggregationFieldApiName != null ? chartRequest.aggregationFieldApiName : '');
        return 'Count';
    }
}
