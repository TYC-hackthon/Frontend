<template>
    <v-snackbar-queue v-model = 'toast' total-visible = 5 />
    <router-view />
</template>

<script lang="ts" setup>
    import { onMounted, provide, ref, type Ref } from 'vue';

    // Properties for other general modules
    const inited = ref(false);
    const loading = ref(true);
    provide('loading', loading);
    provide('inited', inited);
    
    // General function
    const toast: Ref<{[id: string]: any}[]> = ref([]);

    const error = (error: string) => {
        toast.value.push({
            text: error,
            prependIcon: 'mdi-alert',
            color: 'pink',
            timer: 'bottom'
        })
    }

    const info = (x: string) => {
        toast.value.push({
            text: x,
            prependIcon: 'mdi-check-circle',
            color: 'teal',
            timer: 'bottom'
        })
    }
    
    provide('error', error);
    provide('info', info);
    provide('toast', toast);

    const init = () => {
        inited.value = true;
        loading.value = false;
    }
    
    onMounted(() => {
        init();
    })

    // toast API
    const qerror = (x: string) => {
        localStorage.setItem('message_queue', x);
        localStorage.setItem('message_type', 'error');
    }
    const qinfo = (x: string) => {
        localStorage.setItem('message_queue', x);
        localStorage.setItem('message_type', 'info');
    }
    onMounted(() => {
        const message = localStorage.getItem('message_queue');
        if(message == null) return;
        const type = localStorage.getItem('message_type');

        localStorage.removeItem('message_queue');
        localStorage.removeItem('message_type');

        switch(type) {
            case 'error':
                error(message);
                break;
            case 'info':
                info(message);
                break;
            default:
                info(message);
        }
    })
    const kick = (x: string) => {
        qerror(x);
        location.href = '/';
    }
    provide('qerror', qerror);
    provide('kick', kick);
    provide('qinfo', qinfo);
</script>
