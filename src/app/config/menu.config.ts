import { MenuItem } from "../models/system.model";


export const MENU_ITEMS: MenuItem[] = [
  {
    route: '/dashboard',
    label: 'Dashboard',
    icon: 'analytics'
  },
  {
    route: '/clientes',
    label: 'Clientes',
    icon: 'people'
  },
  {
    route: '/apolices',
    label: 'Apólices',
    icon: 'description'
  },
  {
    route: '/relatorios',
    label: 'Relatórios',
    icon: 'bar_chart',
  },
  {
    route: '/multi-calculo',
    label: 'Multi Cálculo',
    icon: 'calculate'
  },
  {
    route: '/administracao',
    label: 'Administração',
    icon: 'settings',
    subMenu: true,
    children: [
      {
        route: '/administracao/seguradoras',
        label: 'Seguradoras',
        icon: 'business'
      },
      {
        route: '/administracao/produtos',
        label: 'Produtos',
        icon: 'inventory_2'
      }
    ]
  }
];