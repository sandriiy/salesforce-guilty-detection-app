public inherited sharing class ReviewProcessLifecycleService {
    private List<ReviewProcess__c> reviewProcesses;

    public ReviewProcessLifecycleService(List<ReviewProcess__c> reviewProcesses) {
        this.reviewProcesses = reviewProcesses;
    }

    public List<ReviewProcess__c> handleTransition(Map<Id, ReviewProcess__c> oldReviewProcesses) {
        DateTime now = System.now();

        for (ReviewProcess__c reviewProcess : reviewProcesses) {
            if (reviewProcess.EndDateTime__c == null || reviewProcess.EndDateTime__c <= now) {
                continue;
            }

            ReviewProcess__c oldRecord = oldReviewProcesses != null ? oldReviewProcesses.get(reviewProcess.Id) : null;
            if (oldRecord != null && isChanged(reviewProcess, oldRecord, 'Status__c') && reviewProcess.Status__c == 'Completed') {
                reviewProcess.IsNotFulfilled__c = true;
            }
        }

        return reviewProcesses;
    }

	public List<ReviewProcess__c> handleRecordFiltersChange(Map<Id, ReviewProcess__c> oldReviewProcesses) {
		for (ReviewProcess__c reviewProcess : reviewProcesses) {
            ReviewProcess__c oldRecord = oldReviewProcesses != null ? oldReviewProcesses.get(reviewProcess.Id) : null;
            if (oldRecord != null && isChanged(reviewProcess, oldRecord, 'FilterCriteria__c')) {
				if (String.isBlank(reviewProcess.FilterCriteria__c)) {
					reviewProcess.TotalReviewableRecords__c = 0;
					reviewProcess.HasFilterErrors__c = false;
				} else {
					try {
						ReviewFilterCriteriaWrapper filterCriteriaWrapper = (ReviewFilterCriteriaWrapper) JSON.deserialize(reviewProcess.FilterCriteria__c, ReviewFilterCriteriaWrapper.class);
						SObjectFilterQueryBuilder.Result filterCriteriaResponse = new SObjectFilterQueryBuilder(filterCriteriaWrapper.selectedSObject)
							.withFilters(filterCriteriaWrapper.selectedFilters)
							.withLogic(filterCriteriaWrapper.selectedFilterLogic)
							.run();

						if (!filterCriteriaResponse.success) {
							// TODO: Log
							System.debug(filterCriteriaResponse);
							reviewProcess.TotalReviewableRecords__c = 0;
							reviewProcess.HasFilterErrors__c = true;
						} else {
							reviewProcess.TotalReviewableRecords__c = filterCriteriaResponse.cursor.getNumRecords();
							reviewProcess.HasFilterErrors__c = false;
						}
					} catch (Exception ex) {
						// TODO: Log
						System.debug(ex);
						reviewProcess.TotalReviewableRecords__c = 0;
						reviewProcess.HasFilterErrors__c = true;
					}
				}
            }
        }

        return reviewProcesses;
	}

    private Boolean isChanged(ReviewProcess__c newReviewProcess, ReviewProcess__c oldReviewProcess, String fieldName) {
		if (newReviewProcess == null || oldReviewProcess == null || String.isBlank(fieldName)) {
			return false;
		}

		Object newVal = newReviewProcess.get(fieldName);
    	Object oldVal = oldReviewProcess.get(fieldName);

		if (newVal == null && oldVal == null) {
			return false;
		} else if (newVal != null && oldVal == null) {
			return true;
		} else if (oldVal != null && newVal == null) {
			return true;
		}

		return String.valueOf(newVal) != String.valueOf(oldVal);
    }
}