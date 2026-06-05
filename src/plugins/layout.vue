<template>
    <v-app>
        <v-app-bar
        color = grey
        class = elevate
        scroll-behavior = 'collapse'
        elevate = 3
        
        rounded
        >
        <template #prepend>
            <v-app-bar-nav-icon>
                <a class = 'nodeco' href = '/'>
                    <v-progress-circular indeterminate v-if = loading />
                    <v-icon class = ma-1 v-else> mdi-toolbox </v-icon>
                </a>
            </v-app-bar-nav-icon>
            <v-app-bar-title>
                    <a class = 'nodeco' href = '/'>
                        <slot name = 'title'>
                            {{ title }}
                        </slot>
                    </a>
                </v-app-bar-title>
            </template>
            
            <template #append>
                <v-hover>
                    <template #default = '{isHovering, props}'>
                        <a href = '/login' class = 'd-flex align-center nodeco' v-if = '!logined'>
                            <v-card variant = plain class = 'd-flex align-center' v-ripple>
                                <b> 登入 </b>
                                <v-icon class = ma-2> mdi-login </v-icon>
                            </v-card>
                        </a>
                        <v-card v-bind = props variant = plain class = 'd-flex align-center' v-ripple @click = account.logout v-else>
                            <b> {{ isHovering ? '登出' : username }} </b>
                            <v-icon class = ma-2> mdi-login </v-icon>
                        </v-card>
                    </template>
                </v-hover>
            </template>
        </v-app-bar>
        <v-main>
            <v-progress-linear :indeterminate = loading bg-color = transparent />
            <slot />
        </v-main>
    </v-app>
</template>

<script lang = ts setup>
    import { inject, type Ref } from 'vue';
    
    const error: Function = inject('error')!;
    const logined: boolean = inject('logined')!;
    const account: {[id: string]: Function} = inject('account')!;
    const username: String = inject('username')!;
    const loading: Ref<boolean> = inject('loading')!;

    const props = defineProps({
        title: {
            type: String,
            default: "ysh's toolbox"
        }
    })
</script>

<style>
body {
  background-color: white;
}
.v-card-title {
    font-weight: 900 !important;
}
.nodeco {
    text-decoration: none !important;
    color: inherit;
}
.v-app-bar {
    position: fixed !important;
}
</style>