import { Component } from '@angular/core';
import { RouterOutlet } from "@angular/router";
import { SidebarComponent } from "../../layout/sidebar/sidebar.component";

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss'
})
export class AuthLayoutComponent {

}
