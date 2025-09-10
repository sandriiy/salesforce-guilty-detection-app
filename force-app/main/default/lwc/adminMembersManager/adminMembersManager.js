import { LightningElement, track, wire } from 'lwc';

import membersAdditionModal from 'c/guiltyMembersAdditionModal';
import getAllGuiltyMembers from '@salesforce/apex/GuiltyMembersController.getAllGuiltyMembers';
import addNewGuiltyMembers from '@salesforce/apex/GuiltyMembersController.addNewGuiltyMembers';
import updateGuiltyMemberRole from '@salesforce/apex/GuiltyMembersController.updateGuiltyMemberRole';
import removeGuiltyMember from '@salesforce/apex/GuiltyMembersController.removeGuiltyMember';

import ADMIN_USER_ID from '@salesforce/user/Id';
import { showToast, isEmpty } from 'c/utils';
import { GUILTY_ROLE_OPTIONS, GUILTY_REVIEWER_ROLE_NAME, GUILTY_ADMIN_ROLE_NAME, GUILTY_BOTH_ROLE_NAME } from 'c/utils';
import { refreshApex } from '@salesforce/apex';

export default class AdminMembersManager extends LightningElement {
    @track isManagerOpen = true;
    @track allMembers = [];

    @track isLoading = true;
    @track roleOptions = GUILTY_ROLE_OPTIONS;

    wiredGuiltyMembers;
    @wire(getAllGuiltyMembers)
    wiredMembers(result) {
        this.wiredGuiltyMembers = result;

        const {data, error} = result;
        if (data) {
            this.allMembers = this.resolveUsersByRole(data);
            this.isLoading = false;
        } else if (error) {
            showToast(
                this,
                'Unable To Retrieve Guilty Members',
                'For more information, contact your System Administrator',
                'error'
            );
        }
    }

    async handleMemberAddClick(event) {
        const membersToAdd = await membersAdditionModal.open({
            label: 'Add New Members',
            size: 'medium',
            content: ''
        });

        if (membersToAdd !== 'cancel' && membersToAdd.length > 0) {
            this.isLoading = true;
            await this.splitAndAssignPermissions(membersToAdd);
            await refreshApex(this.wiredGuiltyMembers);
            this.isLoading = false;
        }
    }

    async handleMemberRoleChange(event) {
        let newRole = event.detail.value;
        const parentContainer = event.target.closest('div[data-id]');
        const parentContainerId = parentContainer.getAttribute('data-id');
        let member = this.allMembers.find((member) => member.Id == parentContainerId);

        this.isLoading = true;
        await this.checkAndUpdateMemberRole(member, newRole);
        this.isLoading = false;
    }

    async handleRemoveMemberClick(event) {
        const parentContainer = event.target.closest('div[data-id]');
        const parentContainerId = parentContainer.getAttribute('data-id');
        let member = this.allMembers.find((member) => member.Id == parentContainerId);
        this.isLoading = true;
        await this.checkAndRemoveMember(member);
        this.isLoading = false;
    }

    get membersContentToggleIcon() {
        return this.isManagerOpen ? 'utility:up' : 'utility:down';
    }

    get membersContentClass() {
        return this.isManagerOpen ? 'add-members-content visible' : 'add-members-content hidden';
    }

    handleMembersContentToggle() {
        this.isManagerOpen = !this.isManagerOpen;
    }

    resolveUsersByRole(userMap) {
        const resultMap = new Map();

        // Process Reviewers
        userMap.Reviewers?.forEach(user => {
            if (user.Id === ADMIN_USER_ID) return;

            const title = user.Title ? user.Title : 'User';
            resultMap.set(user.Id, { ...user, Title: title, role: GUILTY_REVIEWER_ROLE_NAME });
        });

        // Process Admins
        userMap.Admins?.forEach(user => {
            if (user.Id === ADMIN_USER_ID) return;

            const title = user.Title ? user.Title : 'User';
            if (resultMap.has(user.Id)) {
                const existingUser = resultMap.get(user.Id);
                existingUser.role = GUILTY_BOTH_ROLE_NAME;
                if (!existingUser.Title || existingUser.Title === 'User') {
                    existingUser.Title = title;
                }
            } else {
                resultMap.set(user.Id, { ...user, Title: title, role: GUILTY_ADMIN_ROLE_NAME });
            }
        });

        return Array.from(resultMap.values());
    }

    async splitAndAssignPermissions(users) {
        const guiltyReviewerIds = [];
        const guiltyAdminIds = [];

        users.forEach(user => {
            if (user.type === GUILTY_REVIEWER_ROLE_NAME) {
                guiltyReviewerIds.push(user.id);
            } else if (user.type === GUILTY_ADMIN_ROLE_NAME) {
                guiltyAdminIds.push(user.id);
            } else if (user.type === GUILTY_BOTH_ROLE_NAME) {
                guiltyReviewerIds.push(user.id);
                guiltyAdminIds.push(user.id);
            }
        });

        await addNewGuiltyMembers({ guiltyReviewerIds: guiltyReviewerIds, guiltyAdminIds: guiltyAdminIds})
            .catch(error => {
                console.error(error);
                showToast(
                    this,
                    'Unable To Add New Member',
                    'Please try again or contact your System Administrator',
                    'error'
                );
            });
    }

    async checkAndUpdateMemberRole(member, newRole) {
        if (isEmpty(newRole) || member.role === newRole) return;

        try {
            await updateGuiltyMemberRole({ userId: member.Id, existingRole: member.role, newRole: newRole });
            member.role = newRole;
        } catch (error) {
            console.log(error);
            showToast(
                this,
                'Unable To Update Member Role',
                'Please try again or contact your System Administrator',
                'error'
            );
            await refreshApex(this.wiredGuiltyMembers);
        }
    }

    async checkAndRemoveMember(memberToRemove) {
        // save guard to NOT remove myself

        try {
            await removeGuiltyMember({ userId: memberToRemove.Id });
            this.allMembers = this.allMembers.filter(member => member.Id !== memberToRemove.Id);
        } catch (error) {
            console.log(error);
            showToast(
                this,
                'Unable To Remove Member',
                'Please try again or contact your System Administrator',
                'error'
            );
            await refreshApex(this.wiredGuiltyMembers);
        }
    }
}