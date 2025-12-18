export interface MenuItem {
    route: string;
    label: string;
    icon: string;
    children?: MenuItem[];
    subMenu?: boolean;
}