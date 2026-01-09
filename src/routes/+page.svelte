<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		const checkAuth = async () => {
			try {
				const res = await fetch('/auth/check');
				const data = await res.json();
				
				if (data.authenticated && data.user) {
					// User is logged in, redirect based on role
					const userRole = data.user.role?.toLowerCase() || 'employee';
					
					// Check for manager/admin roles
					const isManager = ['manager', 'admin'].includes(userRole);
					
					if (isManager) {
						goto('/manager/dashboard');
					} else {
						goto('/employee/dashboard');
					}
				} else {
					// User is not logged in, redirect to login
					goto('/auth/login');
				}
			} catch (error) {
				// If auth check fails, go to login
				console.error('Auth check failed:', error);
				goto('/auth/login');
			}
		};
		
		checkAuth();
	});
</script>

<!-- Loading screen while redirecting -->
<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-950">
	<div class="text-center">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 dark:border-purple-500 mx-auto mb-4"></div>
		<p class="text-gray-600 dark:text-gray-300">Redirecting...</p>
	</div>
</div>