import { TestBed } from '@angular/core/testing';

import { ItemBaixaService } from './item-baixa.service';

describe('ItemBaixaService', () => {
  let service: ItemBaixaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ItemBaixaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
