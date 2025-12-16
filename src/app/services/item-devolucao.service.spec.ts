import { TestBed } from '@angular/core/testing';

import { ItemDevolucaoService } from './item-devolucao.service';

describe('ItemDevolucaoService', () => {
  let service: ItemDevolucaoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ItemDevolucaoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
