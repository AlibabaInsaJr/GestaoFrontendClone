import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalhesModeloComponent } from './detalhes-modelo.component';

describe('DetalhesModeloComponent', () => {
  let component: DetalhesModeloComponent;
  let fixture: ComponentFixture<DetalhesModeloComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalhesModeloComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetalhesModeloComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
