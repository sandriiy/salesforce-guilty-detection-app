public inherited sharing class ReviewProcessDataInterpreterService {
    private final ReviewProcess__c reviewProcess;
    private ReviewFilterCriteriaWrapper cachedFilterCriteria;

    public ReviewProcessDataInterpreterService(ReviewProcess__c reviewProcess) {
        this.reviewProcess = reviewProcess;
    }

    /**
     * Build lightning-datatable columns from the provided FilterField list and
     * create a query/cursor using SObjectFilterQueryBuilder service class.
     */
    public LightningDatatableInfo buildLightningColumnsAndCursor(List<ReviewFilterCriteriaWrapper.FilterField> fields) {
        List<LightningDatatableInfo.DatatableColumn> columns = convertToDatatableColumns(fields);

        ReviewFilterCriteriaWrapper criteria = parseFilterCriteria();
        if (criteria == null) {
            return new LightningDatatableInfo(columns, null);
        }

        List<String> fieldApiNames = new List<String>();
        for (ReviewFilterCriteriaWrapper.FilterField filterField : (fields == null ? new List<ReviewFilterCriteriaWrapper.FilterField>() : fields)) {
            if (filterField != null && String.isNotBlank(filterField.field)) {
				fieldApiNames.add(filterField.field);
			}
        }

        List<FilterConditionWrapper> filterConds = toFilterConditions(criteria);
        String logic = String.isNotBlank(criteria.selectedFilterLogic) ? criteria.selectedFilterLogic : null;

        SObjectFilterQueryBuilder.Result result =
            new SObjectFilterQueryBuilder(criteria.selectedSObject)
                .withFilters(filterConds)
                .withLogic(logic)
                .withFields(fieldApiNames)
                .run();
		
        return new LightningDatatableInfo(columns, result);
    }

	public List<ReviewFilterCriteriaWrapper.FilterField> extractAllFilterFields() {
		List<ReviewFilterCriteriaWrapper.FilterField> allFilterFields = new List<ReviewFilterCriteriaWrapper.FilterField>();

        ReviewFilterCriteriaWrapper criteria = parseFilterCriteria();
        if (criteria == null || criteria.selectedFilters == null) {
			return allFilterFields;
		} else {
			Set<String> uniqueFields = new Set<String>();
			for (ReviewFilterCriteriaWrapper.FilterField selectedFilter : criteria.selectedFilters) {
				if (selectedFilter != null && !uniqueFields.contains(selectedFilter.field)) {
					allFilterFields.add(selectedFilter);
				}
			}

        	return allFilterFields;
		}
    }

    public String extractSObjectApiName() {
        ReviewFilterCriteriaWrapper criteria = parseFilterCriteria();
        return (criteria == null) 
			? null 
			: criteria.selectedSObject;
    }

    private ReviewFilterCriteriaWrapper parseFilterCriteria() {
        if (cachedFilterCriteria != null) return cachedFilterCriteria;

        String raw = (reviewProcess == null) ? null : String.valueOf(reviewProcess.FilterCriteria__c);
        if (String.isNotBlank(raw)) {
			try {
				cachedFilterCriteria = (ReviewFilterCriteriaWrapper) JSON.deserialize(raw, ReviewFilterCriteriaWrapper.class);
			} catch (Exception e) {
				cachedFilterCriteria = null;
			}
		}

        return cachedFilterCriteria;
    }

    private List<LightningDatatableInfo.DatatableColumn> convertToDatatableColumns(List<ReviewFilterCriteriaWrapper.FilterField> fields) {
        List<LightningDatatableInfo.DatatableColumn> cols = new List<LightningDatatableInfo.DatatableColumn>();
        if (fields != null) {
			Set<String> seenFields = new Set<String>();
			for (ReviewFilterCriteriaWrapper.FilterField filterField : fields) {
				if (filterField == null || seenFields.contains(filterField.field)) {
					continue;
				}

				cols.add(new LightningDatatableInfo.DatatableColumn(
					filterField.field,
					filterField.field,
					normalizeDatatableType(filterField.type)
				));

				seenFields.add(filterField.field);
			}
		}

        return cols;
    }

    private String normalizeDatatableType(String rawType) {
        String t = (rawType == null) ? 'text' : rawType.trim().toLowerCase();

        if (t == 'double' || t == 'integer' || t == 'long' || t == 'int' || t == 'decimal' || t == 'number') return 'number';
        if (t == 'currency') return 'currency';
        if (t == 'percent') return 'percent';
        if (t == 'date') return 'date';
        if (t == 'datetime' || t == 'datetime2') return 'date';
        if (t == 'boolean') return 'boolean';
        if (t == 'phone') return 'phone';
        if (t == 'email') return 'email';
        if (t == 'url') return 'url';

        return 'text';
    }

    private List<FilterConditionWrapper> toFilterConditions(ReviewFilterCriteriaWrapper criteria) {
        List<FilterConditionWrapper> minimizedFilters = new List<FilterConditionWrapper>();
        if (criteria == null || criteria.selectedFilters == null) return minimizedFilters;

        Integer filterIndex = 0;
        for (ReviewFilterCriteriaWrapper.FilterField filterFiell : criteria.selectedFilters) {
            String filterValue = (filterFiell.value == null) ? null : filterFiell.value;

            minimizedFilters.add(
				new FilterConditionWrapper(
					filterIndex, 
					filterFiell.field, 
					filterFiell.selectedCondition, 
					filterValue
				)
			);

            filterIndex++;
        }

        return minimizedFilters;
    }
}
