import { Component } from '@angular/core';
import { RouterOutlet } from "@angular/router";
import { SidebarComponent } from "../../layout/sidebar/sidebar.component";
import { UserMenuComponent } from "../../components/user-menu/user-menu.component";

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, UserMenuComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {

}
