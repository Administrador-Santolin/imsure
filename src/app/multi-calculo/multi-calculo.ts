import { Component } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { MatCard } from "@angular/material/card";
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-multi-calculo',
  imports: [RouterModule, MatCard, MatIcon, RouterLink],
  templateUrl: './multi-calculo.html',
  styleUrl: './multi-calculo.scss'
})
export class MultiCalculo {

}
