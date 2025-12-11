<script lang="ts">
  export let notification: any;

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
</script>

<div
  class="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
  class:font-bold={!notification.isRead}
>
  <!-- Unread dot -->
  {#if !notification.isRead}
    <div class="w-2 h-2 bg-red-600 rounded-full mt-1"></div>
  {/if}

  <div class="flex-1">
    <div class="text-sm text-gray-800 dark:text-gray-200">{notification.title}</div>
    <div class="text-xs text-gray-500 dark:text-gray-400">{notification.message}</div>
    <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(notification.createdAt)}</div>
  </div>
</div>
