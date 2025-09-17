public class LightningDatatableInfo {
	@AuraEnabled
	public List<DatatableColumn> columns;
	@AuraEnabled
	public List<SObject> records;
	@AuraEnabled
    public Integer totalCount;
    public SObjectFilterQueryBuilder.Result queryResult;

	public LightningDatatableInfo(List<DatatableColumn> columns, SObjectFilterQueryBuilder.Result queryResult) {
		this.columns = columns;
		this.queryResult = queryResult;
	}

    public class DatatableColumn {
		@AuraEnabled
        public String label;
		@AuraEnabled
        public String fieldName;
		@AuraEnabled
        public String type;

        public DatatableColumn(String label, String fieldName, String type) {
            this.label = label;
            this.fieldName = fieldName;
            this.type = type;
        }
    }
}