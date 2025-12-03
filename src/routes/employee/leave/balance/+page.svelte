<script lang="ts">
  import { onMount } from 'svelte';
  import * as Card from '$lib/components/ui/card';
  import * as Alert from '$lib/components/ui/alert';
  import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbSeparator,
    BreadcrumbPage
  } from '$lib/components/ui/breadcrumb';
  import { Printer, LayoutGrid, Table } from 'lucide-svelte';

  import LeaveBalanceCards from '../components/LeaveBalanceCards.svelte';
  import LeaveBalanceTable from '../components/LeaveBalanceTable.svelte';
  import { getEmpLeaveBalance } from '../../dashboard/services/dashboardAPI';
  import { exportToPDF, fetchExcelExport } from '$lib/utils/exportHelpers';

  let leaveBalances: any[] = [];
  let loading = true;
  let error: string | null = null;
  let viewMode: 'cards' | 'table' = 'cards';
  let alertMessage: string | null = null;
  let alertVariant: 'success' | 'error' | 'info' = 'info';

  function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
    alertMessage = message;
    alertVariant = variant;
    setTimeout(() => (alertMessage = null), 8000);
  }

  async function loadLeaveBalances() {
    loading = true;
    try {
      leaveBalances = await getEmpLeaveBalance();
    } catch (err) {
      console.error(err);
      error = 'Failed to load leave balances';
    } finally {
      loading = false;
    }
  }

  async function handleExport() {
    try {
      await fetchExcelExport(
        leaveBalances,
        'My Leave Balance',
        { name: 'My Company' } // optionally replace with actual company info
      );
      showAlert('Export successful', 'success');
    } catch (err) {
      console.error(err);
      showAlert('Export failed', 'error');
    }
  }

  onMount(() => {
    loadLeaveBalances();
  });

  function toggleView(mode: 'cards' | 'table') {
    viewMode = mode;
  }
</script>

<svelte:head>
  <title>My Leave Balance – MyBM Hub</title>
  <meta name="description" content="View your leave balance for current year." />
</svelte:head>

<Card.Root class="w-full p-6 space-y-4">
  <!-- Header -->
  <Card.Header>
    <div class="flex flex-col">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/employee/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/employee/leave/apply">Leave</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Leave Balance</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <br/>

      <div>
        <Card.Title>My Leave Balance</Card.Title>
        <Card.Description class="mt-1 text-gray-500 dark:text-gray-400">
          View your leave balance for current year.
        </Card.Description>
      </div>
    </div>
  </Card.Header>

  <Card.Content>
    <!-- Alert -->
    {#if alertMessage}
      <Alert.Root variant={alertVariant}>
        <Alert.Title>
          {alertVariant === 'success' ? 'Success' : alertVariant === 'error' ? 'Error' : 'Info'}
        </Alert.Title>
        <Alert.Description>{alertMessage}</Alert.Description>
      </Alert.Root>
    {/if}

    <!-- Controls: Toggle & Export -->
    <div class="flex justify-between mb-4 items-center">
      <div class="flex items-center space-x-2 dark:text-gray-50 text-gray-600">
        <!-- Cards View Icon Button -->
        <button
          on:click={() => toggleView('cards')}
          class="p-2 rounded-md transition-colors
            {viewMode === 'cards'
              ? 'bg-primary text-primary-foreground'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
          title="Cards View"
          aria-label="Switch to cards view"
        >
          <LayoutGrid class="w-5 h-5" />
        </button>
        
        <!-- Table View Icon Button -->
        <button
          on:click={() => toggleView('table')}
          class="p-2 rounded-md transition-colors
            {viewMode === 'table'
              ? 'bg-primary text-primary-foreground'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
          title="Table View"
          aria-label="Switch to table view"
        >
          <Table class="w-5 h-5" />
        </button>
      </div>
      
      <!-- Export Icon Button -->
      <button
        on:click={handleExport}
        class="p-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 
               hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Export to Excel"
        aria-label="Export to Excel"
      >
        <Printer class="w-5 h-5" />
      </button>
    </div>

    <!-- Main Content -->
    {#if loading}
      <div class="text-gray-500 dark:text-gray-400">Loading leave balances...</div>
    {:else if error}
      <div class="text-red-500">{error}</div>
    {:else}
      {#if viewMode === 'cards'}
        <LeaveBalanceCards {leaveBalances} />
      {:else}
        <LeaveBalanceTable {leaveBalances} />
      {/if}
    {/if}
  </Card.Content>
</Card.Root>