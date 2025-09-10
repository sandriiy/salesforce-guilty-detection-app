import { api, track, wire } from 'lwc';
import LightningModal from 'lightning/modal';

import getAllNotGuiltyMembers from '@salesforce/apex/GuiltyMembersController.getAllNotGuiltyMembers';

import { GUILTY_REVIEWER_ROLE_NAME, GUILTY_ADMIN_ROLE_NAME, GUILTY_BOTH_ROLE_NAME } from 'c/utils';
const AVAILABLE_USERS_COLUMNS = [
    { label: 'Name', fieldName: 'name' },
    { label: 'Profile', fieldName: 'profile' },
    { label: 'Role', fieldName: 'role' },
    {
        type: 'action',
        typeAttributes: {
            rowActions: [
                { label: 'Add as Reviewer', name: GUILTY_REVIEWER_ROLE_NAME },
                { label: 'Add as Admin', name: GUILTY_ADMIN_ROLE_NAME },
                { label: 'Add as Both', name: GUILTY_BOTH_ROLE_NAME }
            ],
            menuAlignment: 'auto'
        }
    }
];

export default class GuiltyMembersAdditionModal extends LightningModal {
    @api label;
    @api content;

    @track isLoading = true;
    @track columns = AVAILABLE_USERS_COLUMNS;
    @track allUsers = [];
    @track profileOptions = [];
    @track roleOptions = [];
    @track searchKey = '';
    @track selectedProfile = '';
    @track selectedRole = '';
    @track selectedUsers = [];

    async connectedCallback() {
        this.isLoading = true;
        await this.loadNotGuiltyMembers();
        this.isLoading = false;
    }

    closeModal(event) {
        this.close('cancel');
    }

    handleCancel(event) {
        this.close('cancel');
    }

    handleAddMembers(event) {
        this.close(this.selectedUsers);
    }

    handleSearch(event) {
        this.searchKey = event.target.value;
    }

    handleProfileFilter(event) {
        this.selectedProfile = event.detail.value;
    }

    handleRoleFilter(event) {
        this.selectedRole = event.detail.value;
    }

    handleAddUser(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        row.type = actionName;

        this.selectedUsers = [...this.selectedUsers, row];
    }

    handleRemoveUser(event) {
        const userId = event.currentTarget.dataset.id;
        this.selectedUsers = this.selectedUsers.filter(user => user.id !== userId);
    }

    get filteredUsers() {
        return this.allUsers.filter(user =>
            (!this.searchKey || user.name.toLowerCase().includes(this.searchKey.toLowerCase())) &&
            (!this.selectedProfile || user.profile === this.selectedProfile) &&
            (!this.selectedRole || user.role === this.selectedRole) &&
            !this.selectedUsers.some(sel => sel.id === user.id)
        );
    }

    async loadNotGuiltyMembers() {
        try {
            const data = await getAllNotGuiltyMembers();
            this.processUserData(data);
        } catch (error) {
            showToast(
                this,
                'Unable To Retrieve Non-Members',
                'Please try again or contact your System Administrator',
                'error'
            );
        }
    }

    processUserData(rawUsers) {
        this.profileOptions = this.extractProfiles(rawUsers);
        this.roleOptions = this.extractRoles(rawUsers);
        this.allUsers = this.formatUsers(rawUsers);
    }

    extractProfiles(users) {
        let profileSet = new Set();
        users.forEach(user => {
            let profileName = user?.Profile?.Name;
            if (profileName) {
                profileSet.add(profileName);
            }
        });

        return [
            { label: 'All', value: '' },
            ...[...profileSet].sort().map(name => ({ label: name, value: name }))
        ];
    }

    extractRoles(users) {
        let roleSet = new Set();
        users.forEach(user => {
            let roleName = user?.UserRole?.Name;
            if (roleName) {
                roleSet.add(roleName);
            }
        });

        return [
            { label: 'All', value: '' },
            ...[...roleSet].sort().map(name => ({ label: name, value: name }))
        ];
    }

    formatUsers(users) {
        let uniqueMap = new Map();

        users.forEach(user => {
            if (!uniqueMap.has(user.Id)) {
                uniqueMap.set(user.Id, {
                    id: user.Id,
                    name: user.Name,
                    profile: user?.Profile?.Name || null,
                    role: user?.UserRole?.Name || null
                });
            }
        });

        return Array.from(uniqueMap.values());
    }
}