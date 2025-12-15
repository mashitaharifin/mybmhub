<script lang="ts">
    import * as Card from '$lib/components/ui/card';
    import * as Alert from '$lib/components/ui/alert';
    import Input from '$lib/components/ui/input.svelte';
    import Button from '$lib/components/ui/button.svelte';
    import { createEventDispatcher, onDestroy } from 'svelte';
    import { invalidateAll } from '$app/navigation';
    import { enhance } from '$app/forms';
    import { Pencil } from 'lucide-svelte';

    export let companySettings: Record<string, string> = {};
    const dispatch = createEventDispatcher();

    let isEditing = false;

    function initFormState() {
        return {
            name: companySettings.name ?? '',
            regNo: companySettings.regNo ?? '',
            address: companySettings.address ?? '',
            country: companySettings.country ?? '',
            email: companySettings.email ?? '',
            phone: companySettings.phone ?? ''
        };
    }

    let form = initFormState();

    let logoPreview: string | null = companySettings.logoPath ?? null;
    let logoFile: File | null = null;
    let alertState: { text: string; type: 'success' | 'error' } | null = null;
    let errors: Record<string, string> = {};
    let t: NodeJS.Timeout | null = null;

    function toggleEdit(reset = false) {
        if (reset) {
            form = initFormState();
            logoPreview = companySettings.logoPath ?? null;
            logoFile = null;
            errors = {};
        }
        isEditing = !isEditing;
    }

    function showMessage(text: string, type: 'success' | 'error' = 'success') {
        alertState = { text, type };
        if (t) clearTimeout(t);
        t = setTimeout(() => {
            alertState = null;
            t = null;
        }, 10000);
    }

    onDestroy(() => {
        if (t) clearTimeout(t);
    });

    function handleLogoChange(e: Event) {
        const fileInput = e.target as HTMLInputElement;
        const file = fileInput.files?.[0];
        if (!file) {
            logoFile = null;
            logoPreview = companySettings.logoPath ?? null;
            return;
        }

        if (!file.type.startsWith('image/')) {
            showMessage('Please upload a valid image file.', 'error');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showMessage('Image size must be less than 2MB.', 'error');
            return;
        }

        logoFile = file;
        const reader = new FileReader();
        reader.onload = (e) => (logoPreview = e.target?.result as string);
        reader.readAsDataURL(file);
    }

    function validateForm(): boolean {
        errors = {};

        if (!form.name.trim()) {
            errors.name = 'Company name is required';
        } else if (form.name.trim().length < 2) {
            errors.name = 'Company name must be at least 2 characters';
        }

        if (!form.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (!form.phone.trim()) {
            errors.phone = 'Phone number is required';
        } else if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(form.phone)) {
            errors.phone = 'Please enter a valid phone number';
        }

        if (!form.regNo.trim()) {
            errors.regNo = 'Registration number is required';
        } else if (form.regNo.length > 50) {
            errors.regNo = 'Registration number is too long';
        }

        if (!form.address.trim()) {
            errors.address = 'Address is required';
        } else if (form.address.length > 200) {
            errors.address = 'Address is too long';
        }

        if (!form.country.trim()) {
            errors.country = 'Country is required';
        } else if (form.country.length > 50) {
            errors.country = 'Country name is too long';
        }

        return Object.keys(errors).length === 0;
    }

    function validateField(name: string, value: string): void {
        if (errors[name]) delete errors[name];

        switch (name) {
            case 'name':
                if (!value.trim()) errors.name = 'Company name is required';
                else if (value.trim().length < 2)
                    errors.name = 'Company name must be at least 2 characters';
                break;

            case 'email':
                if (!value.trim()) errors.email = 'Email is required';
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
                    errors.email = 'Please enter a valid email address';
                break;

            case 'phone':
                if (!value.trim()) errors.phone = 'Phone number is required';
                else if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(value))
                    errors.phone = 'Please enter a valid phone number';
                break;

            case 'regNo':
                if (!value.trim()) errors.regNo = 'Registration number is required';
                else if (value.length > 50)
                    errors.regNo = 'Registration number is too long';
                break;

            case 'address':
                if (!value.trim()) errors.address = 'Address is required';
                else if (value.length > 200)
                    errors.address = 'Address is too long';
                break;

            case 'country':
                if (!value.trim()) errors.country = 'Country is required';
                else if (value.length > 50)
                    errors.country = 'Country name is too long';
                break;
        }
    }

    function handleInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const name = target.name as keyof typeof form;
        const value = target.value;
        form[name] = value;
        validateField(name, value);
    }

    // --- Update companySettings when the prop changes (e.g., after invalidateAll) ---
    // This is vital to re-read the updated data into the form variables for the next edit
    $: {
        if (companySettings) {
            // Re-initialize form and logo preview only if not currently editing
            if (!isEditing) {
                form = initFormState();
                logoPreview = companySettings.logoPath ?? null;
            }
        }
    }
</script>

<Card.Root>
    <Card.Header class="flex items-center justify-between">
        <div>
            <Card.Title>Company Information</Card.Title>
            <Card.Description>Manage company profile, contact, and logo.</Card.Description>
            <br />
        </div>
        <button
            on:click={() => toggleEdit()}
            class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="{isEditing ? 'View' : 'Edit'} Company Information"
        >
            {#if isEditing}
                <Pencil class="w-4 h-4 text-gray-500" />
            {:else}
                <Pencil class="w-4 h-4 text-gray-500" />
            {/if}
        </button>
        </Card.Header>

    <Card.Content>
        {#if alertState}
            <div class="mb-3">
                <Alert.Root variant={alertState.type}>
                    <Alert.Title>{alertState.type === 'success' ? 'Success' : 'Error'}</Alert.Title>
                    <Alert.Description>{alertState.text}</Alert.Description>
                </Alert.Root>
            </div>
        {/if}

        {#if !isEditing}
            <div class="grid sm:grid-cols-2 gap-4 text-sm">
                
                <div class="space-y-4 sm:col-span-2">
                    <div class="mb-3">
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="block text-sm font-bold text-gray-700 dark:text-gray-400  mb-1">Company Name</label>
                        <p class="text-base">
                            {companySettings.name || 'N/A'}
                        </p>
                    </div>

                    <div class="mb-3">
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="block text-sm font-bold text-gray-700 dark:text-gray-400  mb-1">Registration No.</label>
                        <p class="text-base">
                            {companySettings.regNo || 'N/A'}
                        </p>
                    </div>

                    <div class="mb-3">
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="block text-sm font-bold text-gray-700 dark:text-gray-400  mb-1">Email</label>
                        <p class="text-base">
                            {companySettings.email || 'N/A'}
                        </p>
                    </div>

                    <div class="mb-3">
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="block text-sm font-bold text-gray-700 dark:text-gray-400  mb-1">Phone</label>
                        <p class="text-base">
                            {companySettings.phone || 'N/A'}
                        </p>
                    </div>

                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <div class="sm:col-span-2 mb-3">
                        <label class="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-1">Address</label>
                        <p class="text-base">
                            {companySettings.address || 'N/A'}
                        </p>
                    </div>

                    <div class="mb-3">
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-1">Country</label>
                        <p class="text-base">
                            {companySettings.country || 'N/A'}
                        </p>
                    </div>
                </div>
                
                <div>
                    <span class="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-400 ">Company Logo</span>
                    {#if companySettings.logoPath}
                        <img
                            src={companySettings.logoPath}
                            alt="Company Logo"
                            class="mt-2 w-32 h-32 object-contain border rounded"
                        />
                    {:else}
                        <p class="text-gray-400">No logo uploaded.</p>
                    {/if}
                </div>
            </div>
        {:else}
            <form
                method="POST"
                action="?/updateCompanyInfo"
                enctype="multipart/form-data"
                use:enhance={({ formData, action }) => {
                    errors = {}; 
                    if (!validateForm()) {
                        return async ({ update }) => {
                            await update(); 
                        }
                    }

                    return async ({ result, update }) => {
                        if (result.type === 'success') {
                            showMessage('Company information updated.', 'success');
                            await invalidateAll();
                            toggleEdit(false); 
                        } else if (result.type === 'failure') {
                            const msg = result.data?.error ? String(result.data.error) : 'Failed to save.';
                            showMessage(msg, 'error');
                        }
                        await update(); 
                    };
                }}
            >
                <div class="grid sm:grid-cols-2 gap-4">
                    <div>
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="block text-sm font-medium mb-1">Company Name</label>
                        <Input name="name" bind:value={form.name} on:input={handleInput} />
                        {#if errors.name}
                            <p class="text-sm text-red-600 mt-1">{errors.name}</p>
                        {/if}
                    </div>

                    <div>
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="block text-sm font-medium mb-1">Registration Number</label>
                        <Input name="regNo" bind:value={form.regNo} on:input={handleInput} />
                        {#if errors.regNo}
                            <p class="text-sm text-red-600 mt-1">{errors.regNo}</p>
                        {/if}
                    </div>

                    <div>
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="block text-sm font-medium mb-1">Email</label>
                        <Input
                            name="email"
                            type="email"
                            bind:value={form.email}
                            on:input={handleInput}
                            placeholder="contact@company.com"
                        />
                        {#if errors.email}
                            <p class="text-sm text-red-600 mt-1">{errors.email}</p>
                        {/if}
                    </div>

                    <div>
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="block text-sm font-medium mb-1">Phone</label>
                        <Input
                            name="phone"
                            bind:value={form.phone}
                            on:input={handleInput}
                            placeholder="+60 12 345 6789"
                        />
                        {#if errors.phone}
                            <p class="text-sm text-red-600 mt-1">{errors.phone}</p>
                        {/if}
                    </div>

                    <div class="sm:col-span-2">
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="block text-sm font-medium mb-1">Address</label>
                        <Input
                            name="address"
                            bind:value={form.address}
                            on:input={handleInput}
                            placeholder="Street, Building, Postal"
                        />
                        {#if errors.address}
                            <p class="text-sm text-red-600 mt-1">{errors.address}</p>
                        {/if}
                    </div>

                    <div>
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="block text-sm font-medium mb-1">Country</label>
                        <Input name="country" bind:value={form.country} on:input={handleInput} />
                        {#if errors.country}
                            <p class="text-sm text-red-600 mt-1">{errors.country}</p>
                        {/if}
                    </div>

                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <div>
                        <label class="block text-sm font-medium mb-1">Company Logo</label>
                        <input type="file" name="logo" accept="image/*" on:change={handleLogoChange} />
                        {#if logoPreview}
                            <img
                                src={logoPreview}
                                alt="Logo Preview"
                                class="mt-2 w-32 h-32 object-contain border rounded"
                            />
                        {/if}
                    </div>
                </div>

                <div class="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="secondary" on:click={() => toggleEdit(true)}>
                        Cancel
                    </Button>
                    <Button type="submit">Save</Button>
                </div>
            </form>
        {/if}
    </Card.Content>
</Card.Root>

<style>
    input[type='file'] {
        display: block;
        width: 100%;
        font-size: 0.875rem;
        color: rgb(75 85 99);
        border: 1px solid rgb(209 213 219);
        border-radius: 0.375rem;
        cursor: pointer;
    }

    input[type='file']:focus {
        outline: none;
    }

    .text-red-600 {
        color: #dc2626;
    }
</style>