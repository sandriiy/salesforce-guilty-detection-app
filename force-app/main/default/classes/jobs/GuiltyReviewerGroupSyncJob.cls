public without sharing class GuiltyReviewerGroupSyncJob implements Queueable {
    public enum GroupAction {
        Add,
        Remove
    }

    private final List<Id> userIds;
    private final GroupAction action;

    public GuiltyReviewerGroupSyncJob(List<Id> userIds, GroupAction action) {
        this.userIds = userIds;
        this.action = action;
    }

    public void execute(QueueableContext context) {
        Group reviewersGroup = retrieveGuiltyReviewersGroup();
        if (!isValidReadiness(reviewersGroup)) return;

        Map<Id, GroupMember> existingMembershipMap = retrieveGuiltyMembershipMap(reviewersGroup.Id, userIds);
        if (action == GroupAction.Add) {
            List<GroupMember> membersToAdd = new List<GroupMember>();
            for (Id userId : userIds) {
                if (!existingMembershipMap.containsKey(userId)) {
                    membersToAdd.add(new GroupMember(
                        GroupId = reviewersGroup.Id,
                        UserOrGroupId = userId
                    ));
                }
            }

            // try-catch ?
            insert membersToAdd;
        } else if (action == GroupAction.Remove) {
            List<GroupMember> membersToRemove = new List<GroupMember>();
            for (Id userId : userIds) {
                if (existingMembershipMap.containsKey(userId)) {
                    membersToRemove.add(existingMembershipMap.get(userId));
                }
            }

            // try-catch ?
            delete membersToRemove;
        }
    }

    private Boolean isValidReadiness(Group reviewersGroup) {
        return (
            reviewersGroup != null 
            && (userIds != null && !userIds.isEmpty())
            && action != null
        );
    }

    private Group retrieveGuiltyReviewersGroup() {
        List<Group> groups = [
            SELECT Id
            FROM Group
            WHERE DeveloperName = 'GuiltyReviewers'
            LIMIT 1
        ];

        return groups.isEmpty() ? null : groups[0];
    }

    public Map<Id, GroupMember> retrieveGuiltyMembershipMap(Id groupId, List<Id> userIds) {
        Map<Id, GroupMember> guiltyMembershipMap = new Map<Id, GroupMember>();
        for (GroupMember gm : [SELECT Id, UserOrGroupId FROM GroupMember WHERE GroupId = :groupId AND UserOrGroupId IN :userIds]) {
            guiltyMembershipMap.put(gm.UserOrGroupId, gm);
        }

        return guiltyMembershipMap;
    }
}