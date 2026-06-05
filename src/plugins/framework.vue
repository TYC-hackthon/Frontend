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

    // login session related
    const logined = ref(false);
    const session: Ref<string | null> = ref('');
    const username: Ref<string | null> = ref('');

    provide('session', session);
    provide('logined', logined);
    provide('username', username);

    const logout = () => {
        // console.log('logout');
        localStorage.removeItem('session');
        $.post('https://api.citrc.tw/wbox/logout', {
            id: session.value
        }, () => {
            info('登出成功');
            init();
        })
    }

    const login = (session: string) => {
        // console.log('login');
        if(logined.value) logout();
        localStorage.setItem('session', session);
        info('登入成功');
        init();
    }

    const account = {
        logout: logout,
        login: login
    }

    provide('account', account);

    const init = () => {
        // console.log('init');
        session.value = localStorage.getItem('session');
        logined.value = false;
        if(session.value) $.ajax({
            url: 'https://api.citrc.tw/wbox/whoami',
            method: 'POST',
            timeout: 5000,
            data: {
                id: session.value
            }
        }).done((response) => {
            // response = JSON.parse(response);
            if(!response['ok']) {
                localStorage.removeItem('session');
                return;
            }
            logined.value = true;
            username.value = response.data;
        }).fail(() => {
            error('驗證失敗');
        }).always(() => {
            inited.value = true;
            loading.value = false;
        })
        else inited.value = true, loading.value = false;
    }
    
    import $ from 'jquery';

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